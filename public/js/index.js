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
  barsObserver.disconnect();
}

// If bars are visible, do an anim
const barsObserver = new IntersectionObserver(updateBars, {threshold: 1.0});
barsObserver.observe(document.getElementById("mastercomfig-bar"));

// Init customization example highlighting
hljs.highlightAll();
