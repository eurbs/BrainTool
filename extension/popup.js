// this code runs under the popup and controls the tag entry for adding a page to BT

'use strict';

var messageDiv = document.getElementById('message');
var tagDiv = document.getElementById('tag');
var newTag = document.getElementById('newtag');
var CurrentTab;
var AwesomeWidget;

function storeBTTab(tabId, tries = 0) {
    // set the global variable on the background page
    var bg = chrome.extension.getBackgroundPage();
    if (!bg) {
        alert("Extension not initialized correctly. \Trying again.");
        setTimeout(function() {
            storeBTTab(tabId, tries + 1);}, 100);
        return;
    }
    bg.BTTab = tabId;
    if (tries) alert("BrainTool Extension initialized");
}
    
function windowOpen() {
    // Called on first click on header button, create the BT panel window
    var wargs = {
//        'url' : "http://localhost:8000/app", // "https://tconfrey.github.io/BrainTool/app", 
        'url' : "https://BrainTool.org/app", 
        'type' : "panel",
        'top' : 10, 'left' : 10,
        'width' : 500, 'height' : 1100 
    };
    chrome.windows.create(wargs, function(window) {
        console.log("window was opened");
        storeBTTab(window.tabs[0].id);
    });
}

function getCurrentTab (callback) {
    // fill a storage variable w the tab to be stored
    chrome.tabs.query({active: true, currentWindow: true}, function(list) {
        // NB only one tab should be active and in the current window 
        chrome.storage.local.set({tabsList: list}, function() {
            CurrentTab = list[0];
            console.log("tabsList is set");                              
            if(callback) {
                callback(list);
            }
        });
    });
}


function generateTagsDisplay(tagsArray) {
    // given an array of {name:"tag", level:2} generate the display string
    let str = "";
    let level = 0;
    for (const tag of tagsArray) {
        if (tag.level == level)
            str += ', ' + tag.name;
        else {
            if (tag.level > level)
                str += '<ul>'.repeat(tag.level - level);
            else
                str += '</ul>'.repeat(level - tag.level);
            str += '<li>' + tag.name;
        }
        level = tag.level;
    }
    return str + '</ul>';
}

function popupAction () {
    // open bt window if not open, otherwise populate tag entry form
    
    var btTab = chrome.extension.getBackgroundPage() ? chrome.extension.getBackgroundPage().BTTab : null;
    if (!btTab) {
        windowOpen();
    } else {
        getCurrentTab(function () {
            messageDiv.style.display = 'none';
            tagDiv.style.display = 'block';
            chrome.storage.local.get('tags', function(data) {
                var tagsArray = data.tags; //JSON.parse(data.tags);
                const tags = tagsArray.map(tag => tag.name);
                var tagsArea = document.getElementById('currentTags');
                tagsArea.innerHTML = generateTagsDisplay(tagsArray);
                var input = document.getElementById("newtag");
                AwesomeWidget = new Awesomplete(input, {
	                list: tags, autoFirst: true
                });
            });
        }); 
    }
}

popupAction();


// set callback on entering tag for tab, nb need to force blur on enter key
window.onkeypress = function(e) {
    console.log(e.which);
    if(e.which == 58) {          // :'s behavior is to select suggestion
        AwesomeWidget.select();
    }
    if (e.which != 13) return // Enter key
//    newTag.blur();
    tabAdded();
}



function tabAdded() {
    // Call out to the content script which will get current tab and add to BT
    const nt = newTag.value;                                     // value from text entry field
    const BTTabId = chrome.extension.getBackgroundPage().BTTab;  // extension global for bttab
    
    // Send msg to BT app for processing w tab and tag info
    chrome.tabs.sendMessage(
        BTTabId,
        {'type': 'new_tab', 'tag': nt},
        {} , 
        function (rsp) {
            if (rsp)        // Send msg to background to perform move (cos this script ends when looses focus)
                chrome.runtime.sendMessage({
                    from: 'popup',
                    msg: 'moveTab',
                    tabId: CurrentTab.id,
                    tag: nt
                });
            else 
                alert("Must be an error! ");
            window.close();
        });
    console.count('new_tab');
}

// Listen for messages from other components
chrome.runtime.onMessage.addListener((msg, sender) => {
    switch (msg.from) {
    case 'btwindow':
        if (msg.msg == 'ready') {
            console.log("BT window is ready");
            window.close();
        }
        break;
    }
    console.count("IN:"+msg.msg);
});
    
