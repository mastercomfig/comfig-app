function loadImage(lazyImage) {
  if (lazyImage.parentNode.classList.contains("twentytwenty-container")) {
    lazyImage.onload = () => {
      window.dispatchEvent(new Event("resize.twentytwenty"));
    }
  }
  lazyImage.src = lazyImage.dataset.src;
  lazyImage.classList.remove("lazy");
}

document.addEventListener("DOMContentLoaded", function() {
  const lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));

  if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          let lazyImage = entry.target;
          loadImage(lazyImage);
          observer.unobserve(lazyImage);
        }
      }
    });

    for (const lazyImage of lazyImages) {
      lazyImageObserver.observe(lazyImage);
    }
  } else {
    for (const lazyImage of lazyImages) {
      loadImage(image);
    }
  }
});
