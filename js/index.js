function updateBarWidth(id, width) {
  let el = document.getElementById(id);
  el.style.width = `${width}%`;
  el.style.willChange = "auto";
}

function updateBars(entries) {
  if (!entries[0].isIntersecting) {
    return;
  }
  updateBarWidth("mastercomfig-bar", 100);
  updateBarWidth("comanglia-bar", 91);
  updateBarWidth("m0re-bar", 90);
  updateBarWidth("chris-bar", 84);
  updateBarWidth("rhapsody-bar", 80);
  observer.disconnect();
}

// If bars are visible, do an anim
const observer = new IntersectionObserver(updateBars, {threshold: 1.0});
observer.observe(document.getElementById("mastercomfig-bar"));

// Init quality image compare
$("#quality-compare").twentytwenty({
  before_label: 'Low',
  after_label: 'Ultra'
});

document.getElementById("compareModal").addEventListener("shown.bs.modal", () => {
  $("#quality-compare-large").twentytwenty({
    before_label: "Low",
    after_label: "Ultra"
  });
});

// Init customization example highlighting
hljs.highlightAll();
