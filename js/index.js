"use strict";

// Init quality image compare
$(function() {
    $("#quality-compare").twentytwenty({
        before_label: 'Low',
        after_label: 'Ultra'
    });
});

// Init customization example highlighting
hljs.highlightAll();

function updateBars() {
    document.getElementById('mastercomfig-bar').style.width = '100%';
    document.getElementById('comanglia-bar').style.width = '91%';
    document.getElementById('m0re-bar').style.width = '90%';
    document.getElementById('chris-bar').style.width = '84%';
    document.getElementById('rhapsody-bar').style.width = '80%';
}

// If we scroll down to the bars, do an anim
document.addEventListener('scroll', function() {
    if ($('#comanglia-bar').visible()) {
        updateBars();
        $(window).off('scroll');
    }
}, {passive: true});

// If page loaded with bars visible, then still do the anim
if ($('#comanglia-bar').visible()) {
    updateBars();
    $(window).off('scroll');
}

$('#compareModal').on('shown.bs.modal', function() {
  $("#quality-compare-large").twentytwenty({
      before_label: 'Low',
      after_label: 'Ultra'
  });
});
