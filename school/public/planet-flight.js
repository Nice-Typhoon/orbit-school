import {planetSchool, planetVisual} from './cosmos.js';

// These dimensions match the background globe in orbit-experience.css.
export function orbitGeometry(width, height, contentWidth = width) {
  const size = width <= 700
    ? Math.max(620, Math.min(width * 1.7, 1000))
    : Math.max(900, Math.min(width * .94, 1900));
  return {size, left: contentWidth - size * .72, top: height * .12};
}

export function installPlanetFlights() {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;

  const clear = flight => {
    if (active !== flight) return;
    active = null;
    flight.animations.forEach(animation => animation.cancel());
    flight.overlay.remove();
    document.documentElement.classList.remove('planet-in-flight');
  };

  const settle = async flight => {
    if (active !== flight) return;
    flight.committed = true;
    location.hash = flight.href;
    // Let the existing hash router render the destination underneath the flight.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (active !== flight) return;
    const reveal = flight.overlay.animate([{opacity: 1}, {opacity: 0}], {
      duration: 410, easing: 'ease-in-out', fill: 'forwards'
    });
    flight.animations.push(reveal);
    try { await reveal.finished; } catch { /* Cancellation also releases the overlay. */ }
    clear(flight);
  };

  document.addEventListener('click', async event => {
    const link = event.target.closest('a[data-flight-school]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    if (active) { event.preventDefault(); return; }
    const school = planetSchool(link.dataset.flightSchool);
    const globe = link.querySelector('.celestial');
    if (!school || !globe || location.hash === link.getAttribute('href') ||
        reducedMotion.matches || document.documentElement.classList.contains('motion-off') ||
        typeof globe.animate !== 'function') return;
    event.preventDefault();

    const from = globe.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const destination = orbitGeometry(innerWidth, innerHeight, width);
    const overlay = document.createElement('div');
    overlay.className = 'planet-flight';
    overlay.dataset.planet = school.planet;
    overlay.innerHTML = `<div class="cosmic-backdrop flight-sky" aria-hidden="true"></div>
      <div class="flight-stars" aria-hidden="true">${Array.from({length: 24}, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const radius = .37 + (i % 4) * .085;
        const x = Math.cos(angle) * width * radius;
        const y = Math.sin(angle) * innerHeight * radius;
        return `<i style="left:calc(57% + ${x}px);top:calc(47% + ${y}px);--dx:${x * .73}px;--dy:${y * .73}px;--angle:${Math.atan2(y, x)}rad;--streak-delay:${100 + i % 5 * 35}ms"></i>`;
      }).join('')}</div>
      <div class="planet-horizon flight-planet" aria-hidden="true">${planetVisual(school.planet)}</div>
      <div class="flight-shade" aria-hidden="true"></div>
      <div class="flight-status" role="status">Выходим на орбиту <span>${school.name}</span></div>`;
    const flyingGlobe = overlay.querySelector('.flight-planet');
    flyingGlobe.style.left = `${destination.left}px`;
    flyingGlobe.style.top = `${destination.top}px`;
    flyingGlobe.style.setProperty('--orbit-size', `${destination.size}px`);
    document.body.append(overlay);
    const flight = {overlay, href: link.getAttribute('href'), origin: link, animations: [], committed: false};
    active = flight;
    document.documentElement.classList.add('planet-in-flight');

    const startX = from.left + from.width / 2;
    const startY = from.top + from.height / 2;
    const endX = destination.left + destination.size / 2;
    const endY = destination.top + destination.size / 2;
    // Paint the original gradients at the current diameter throughout the flight.
    const approach = flyingGlobe.animate(Array.from({length: 33}, (_, i) => {
      const progress = i / 32;
      const arc = Math.sin(Math.PI * progress);
      const size = from.width + (destination.size - from.width) * progress ** 1.4;
      const x = startX + (endX - startX) * progress - width * .045 * arc;
      const y = startY + (endY - startY) * progress + innerHeight * .09 * arc;
      return {
        left: `${x - size / 2}px`,
        top: `${y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`
      };
    }), {duration: 1650, easing: 'cubic-bezier(.42,.02,.18,1)', fill: 'both'});
    const sky = overlay.querySelector('.flight-sky').animate(
      [{opacity: 0}, {opacity: 1}], {duration: 620, easing: 'ease-out', fill: 'both'}
    );
    const shade = overlay.querySelector('.flight-shade').animate(
      [{opacity: 0}, {opacity: 1}], {duration: 900, delay: 350, easing: 'ease-in-out', fill: 'both'}
    );
    flight.animations.push(approach, sky, shade);
    try { await approach.finished; await settle(flight); }
    catch { clear(flight); }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !active) return;
    const flight = active;
    clear(flight);
    if (!flight.committed && flight.origin.isConnected) flight.origin.focus({preventScroll: true});
    else document.querySelector('#main')?.focus({preventScroll: true});
  });
  window.addEventListener('hashchange', () => {
    if (active && location.hash !== active.href) clear(active);
  });
  window.addEventListener('resize', () => {
    if (!active) return;
    const flight = active;
    clear(flight);
    location.hash = flight.href;
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches || !active) return;
    const flight = active;
    clear(flight);
    location.hash = flight.href;
  });
}
