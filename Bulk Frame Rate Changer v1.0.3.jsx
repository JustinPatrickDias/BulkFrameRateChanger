// Bulk Frame Rate Changer
// Version 1.0.1
// Changes the framerate of all selected compositions, image sequences, and imported video files

(function(thisObj)
    {
        var STACK_BELOW_WIDTH = 240;

        // Parse Frame Rate
        function parseFrameRate(raw)
        {
            var s = String(raw).replace(/^\s+|\s+$/g, "");
            s = s.replace(/\s*fps\s*$/i, "");
            if (s === "")
            {
                return NaN;
            }
            if (!/^-?\d+(\.\d+)?$/.test(s))
            {
                return NaN;
            }
            var n = parseFloat(s);
            if (isNaN(n) || !isFinite(n))
            {
                return NaN;
            }
            return n;
        }

        // Checks if a Project is Open
        function Q_ProjectOpen(setStatus)
        {
            if (!app.project)
            {
                setStatus("Error: No project is open.");
                return null;
            }
            return app.project;
        }

        // Checks if a Comp or Footage is Selected
        function Q_CompOrFootageSelected(setStatus)
        {
            var project = Q_ProjectOpen(setStatus);
            if (!project)
            {
                return null;
            }
            var sel = project.selection;
            if (!sel || sel.length === 0)
            {
                setStatus("Error: Nothing selected. Select comps or footage in the Project panel.");
                return null;
            }
            var items = [];
            for (var i = 0; i < sel.length; i++)
            {
                if (sel[i] instanceof CompItem || sel[i] instanceof FootageItem)
                {
                    items.push(sel[i]);
                }
            }
            if (items.length === 0)
            {
                setStatus("Error: No comps or footage in selection.");
                return null;
            }
            return items;
        }

        // User Interface
        function buildUI(thisObj)
        {
            // Window
            var win = (thisObj instanceof Panel)
                ? thisObj
                : new Window("palette", "Bulk Frame Rate Changer", undefined, { resizeable: true });

            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.spacing = 6;
            win.margins = 6;

            // Action Row
            var ACTION_ROW_HEIGHT = 28;
            var actionGroup = win.add("group");
            actionGroup.orientation = "row";
            actionGroup.alignment = ["fill", "top"];
            actionGroup.alignChildren = ["fill", "center"];
            actionGroup.spacing = 6;
            actionGroup.margins = 0;
            actionGroup.maximumSize.height = ACTION_ROW_HEIGHT;

            // Frame Rate Input
            var inputFps = actionGroup.add("edittext", undefined, "23.976");
            inputFps.alignment = ["fill", "center"];
            inputFps.preferredSize.width = 140;
            inputFps.preferredSize.height = 24;
            inputFps.minimumSize.width = 80;

            // Go Button
            var GO_BUTTON_ROW_WIDTH = 48;
            var goButton = actionGroup.add("button", undefined, "Go");
            goButton.alignment = ["right", "center"];
            goButton.preferredSize = [GO_BUTTON_ROW_WIDTH, 24];
            goButton.minimumSize = [GO_BUTTON_ROW_WIDTH, 24];
            goButton.maximumSize.width = GO_BUTTON_ROW_WIDTH;

            // Status Box
            var statusPanel = win.add("panel", undefined, undefined);
            statusPanel.orientation = "column";
            statusPanel.alignment = ["fill", "top"];
            statusPanel.alignChildren = ["fill", "fill"];
            statusPanel.margins = 6;

            // Status Text
            var statusText = statusPanel.add(
                "statictext",
                undefined,
                "Enter a frame rate, select comps and/or footage in the Project panel, then hit Go!",
                { multiline: true }
            );
            statusText.alignment = ["fill", "fill"];
            statusText.preferredSize.height = 80;
            function setStatus(msg)
            {
                statusText.text = msg;
            }

            // Go Button Click
            goButton.onClick = function()
            {
                var targetFrameRate = parseFrameRate(inputFps.text);
                if (isNaN(targetFrameRate) || targetFrameRate <= 0)
                {
                    setStatus("Error: \"" + inputFps.text + "\" is not a valid frame rate.");
                    return;
                }
                changeFrameRate(targetFrameRate, setStatus);
            };

            // Reflow (row vs column based on panel width)
            function reflow()
            {
                var width = win.size ? win.size[0] : 0;
                var wantOrientation = (width > 0 && width < STACK_BELOW_WIDTH) ? "column" : "row";
                if (actionGroup.orientation !== wantOrientation)
                {
                    actionGroup.orientation = wantOrientation;
                    if (wantOrientation === "column")
                    {
                        goButton.alignment = ["fill", "center"];
                        goButton.maximumSize.width = 4096;
                        goButton.preferredSize.width = -1;
                        actionGroup.maximumSize.height = 4096;
                    }
                    else
                    {
                        goButton.alignment = ["right", "center"];
                        goButton.preferredSize.width = GO_BUTTON_ROW_WIDTH;
                        goButton.maximumSize.width = GO_BUTTON_ROW_WIDTH;
                        actionGroup.maximumSize.height = ACTION_ROW_HEIGHT;
                    }
                    win.layout.layout(true);
                    win.layout.resize();
                }
            }

            // Initial Layout + Resize Wiring
            win.preferredSize = [280, -1];
            win.layout.layout(true);
            win.layout.resize();
            reflow();

            win.onResizing = win.onResize = function()
            {
                this.layout.resize();
                reflow();
            };

            if (win instanceof Window)
            {
                win.center();
                win.show();
            }
            return win;
        }

        // Ask Drop Frame or Non-Drop Frame
        // Returns true (drop frame), false (non-drop frame), or null (cancelled)
        function askDropFrame()
        {
            var dlg = new Window("dialog", "Bulk Frame Rate Changer");
            dlg.orientation = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing = 12;
            dlg.margins = 16;

            var msg = dlg.add("statictext", undefined, "Drop frame or nah?");
            msg.alignment = ["center", "top"];

            var btnGroup = dlg.add("group");
            btnGroup.orientation = "row";
            btnGroup.alignment = ["fill", "top"];
            btnGroup.alignChildren = ["fill", "center"];
            btnGroup.spacing = 10;

            var dropBtn = btnGroup.add("button", undefined, "Drop Frame");
            var nonDropBtn = btnGroup.add("button", undefined, "Non-Drop frame");

            var result = null;
            dropBtn.onClick = function() { result = true; dlg.close(); };
            nonDropBtn.onClick = function() { result = false; dlg.close(); };

            dlg.show();
            return result;
        }

        // Change Frame Rate
        function changeFrameRate(targetFrameRate, setStatus)
        {
            var items = Q_CompOrFootageSelected(setStatus);
            if (!items)
            {
                return;
            }

            // Drop frame is only relevant for 29.97 and 59.94 fps.
            var isDropFrameRate =
                (Math.abs(targetFrameRate - 29.97) < 0.01) ||
                (Math.abs(targetFrameRate - 59.94) < 0.01);
            var useDropFrame = false;
            if (isDropFrameRate)
            {
                var choice = askDropFrame();
                if (choice === null)
                {
                    setStatus("Cancelled. No changes made.");
                    return;
                }
                useDropFrame = choice;
            }

            app.beginUndoGroup("Change Frame Rate to " + targetFrameRate);
            var compCount = 0;
            var footageCount = 0;
            var skipped = 0;
            for (var i = 0; i < items.length; i++)
            {
                var item = items[i];
                if (item instanceof CompItem)
                {
                    item.frameRate = targetFrameRate;
                    if (isDropFrameRate)
                    {
                        item.dropFrame = useDropFrame;
                    }
                    compCount++;
                }
                else if (item.mainSource && ("conformFrameRate" in item.mainSource))
                {
                    item.mainSource.conformFrameRate = targetFrameRate;
                    footageCount++;
                }
                else
                {
                    skipped++;
                }
            }
            app.endUndoGroup();

            // Set status message
            var parts = [];
            if (compCount > 0)
            {
                parts.push(compCount + " comp" + (compCount > 1 ? "s" : ""));
            }
            if (footageCount > 0)
            {
                parts.push(footageCount + " footage item" + (footageCount > 1 ? "s" : ""));
            }
            var msg = "Updated " + parts.join(" and ") + " to " + targetFrameRate + " fps.";
            if (isDropFrameRate && compCount > 0)
            {
                msg += " (" + (useDropFrame ? "Drop frame" : "Non-drop frame") + ".)";
            }
            if (skipped > 0)
            {
                msg += " (" + skipped + " item" + (skipped > 1 ? "s" : "") + " skipped.)";
            }
            setStatus(msg);
        }

        var win = buildUI(thisObj);
    }
)
(this);
