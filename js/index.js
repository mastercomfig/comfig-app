function updateBars(entries) {
  if (!entries[0].isIntersecting) {
    return;
  }
  document.getElementById('mastercomfig-bar').style.width = '100%';
  document.getElementById('comanglia-bar').style.width = '91%';
  document.getElementById('m0re-bar').style.width = '90%';
  document.getElementById('chris-bar').style.width = '84%';
  document.getElementById('rhapsody-bar').style.width = '80%';
  observer.disconnect();
}

// If bars are visible, do an anim
const observer = new IntersectionObserver(updateBars, {threshold: 1.0});
observer.observe(document.getElementById("comanglia-bar"));

// Init quality image compare
$("#quality-compare").twentytwenty({
  before_label: 'Low',
  after_label: 'Ultra'
});

document.getElementById("compareModal").addEventListener("shown.bs.modal", () => {
  $("#quality-compare-large").twentytwenty({
    before_label: 'Low',
    after_label: 'Ultra'
  });
});

// Init customization example highlighting
hljs.highlightAll();
