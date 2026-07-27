(function(thisObj) {
    function buildUI(thisObj)
    {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Frame Rate Changer", undefined, {resizeable: true});
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 10;
        // Dropdown Group
        var dropdownGroup = win.add("group");
        dropdownGroup.orientation = "row";
        dropdownGroup.alignment = ["fill", "top"];
        dropdownGroup.alignChildren = ["fill", "center"];
        dropdownGroup.spacing = 10;
        var frameRates = ["23.976", "24", "25", "29.97", "30", "50", "59.94", "60"];
        var dropdown = dropdownGroup.add("dropdownlist", undefined, frameRates);
        dropdown.selection = 0;
        // dropdown.alignment = ["fill", "center"];
        // Go button
        var buttonGroup = win.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = ["fill", "top"];
        buttonGroup.alignChildren = ["fill", "center"];
        var goButton = buttonGroup.add("button", undefined, "Go");
        goButton.preferredSize.height = 30;
        goButton.alignment = ["fill", "center"];
        // Status text
        var statusGroup = win.add("group");
        statusGroup.orientation = "row";
        statusGroup.alignment = ["fill", "top"];
        statusGroup.alignChildren = ["fill", "center"];
        var statusText = statusGroup.add("statictext", undefined, "Select comps and click Go", {multiline: true});
        statusText.alignment = ["fill", "center"];
        statusText.preferredSize.height = 50;
        // Button Click
        goButton.onClick = function() {
            var targetFrameRate = parseFloat(dropdown.selection.text);
            changeFrameRate(targetFrameRate, statusText);
        };
        // Window
        win.preferredSize = [250, -1];
        win.layout.layout(true);
        win.layout.resize();
        win.onResizing = win.onResize = function(){
            this.layout.resize();};
        if (win instanceof Window){
            win.center();
            win.show();
        }else{
            win.layout.layout(true);
        }
        return win;
    }
    function changeFrameRate(targetFrameRate, statusText){
        app.beginUndoGroup("Change Frame Rate to " + targetFrameRate);
        var project = app.project;
        if (!project) {
            statusText.text = "Error: No project is open.";
            app.endUndoGroup();
            return;
        }
        var selectedItems = project.selection;
        if (selectedItems.length === 0){
            statusText.text = "Error:\nNothing selected.\nSelect some comps!";
            app.endUndoGroup();
            return;
        }
        var compCount = 0;
        var processedComps = [];
        for (var i = 0; i < selectedItems.length; i++){
            var item = selectedItems[i];
            // Check if the item is a composition
            if (item instanceof CompItem){
                item.frameRate = targetFrameRate;
                processedComps.push(item.name);
                compCount++;
            }
        }
        if (compCount === 0){
            statusText.text = "Error:\nNo comps selected!";
        }else{
            statusText.text = compCount + " comp" + (compCount > 1 ? "s" : "") + " updated to " + targetFrameRate + " fps!";
        }
        app.endUndoGroup();
    }
    var win = buildUI(thisObj);
})(this);