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
    flight.origin.classList.remove('flight-source');
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
      duration: 520, easing: 'ease-out', fill: 'forwards'
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
    const destination = orbitGeometry(innerWidth, innerHeight, document.documentElement.clientWidth);
    const overlay = document.createElement('div');
    overlay.className = 'planet-flight';
    overlay.dataset.planet = school.planet;
    overlay.innerHTML = `<div class="flight-sky" aria-hidden="true"></div>
      <div class="flight-stars" aria-hidden="true">${Array.from({length: 18}, (_, i) => {
        const x = ((i * 37 + 9) % 96) + 2, y = ((i * 59 + 17) % 90) + 5;
        return `<i style="left:${x}%;top:${y}%;--dx:${(x - 50) * 1.5}vw;--dy:${(y - 50) * 1.5}vh;--streak-delay:${i % 4 * 60}ms"></i>`;
      }).join('')}</div>
      <div class="flight-planet" aria-hidden="true">${planetVisual(school.planet)}</div>
      <div class="flight-status" role="status"><span>Выходим на орбиту</span><strong>${school.name}</strong><small>Esc — отменить подлёт</small></div>`;
    const flyingGlobe = overlay.querySelector('.flight-planet');
    Object.assign(flyingGlobe.style, {left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.width}px`});
    flyingGlobe.querySelector('.celestial').style.setProperty('--planet-size', `${from.width}px`);
    document.body.append(overlay);
    const flight = {overlay, href: link.getAttribute('href'), origin: link, animations: [], committed: false};
    active = flight;
    link.classList.add('flight-source');
    document.documentElement.classList.add('planet-in-flight');
    const zoom = flyingGlobe.animate([
      {transform: 'translate(0,0) scale(1)'},
      {transform: `translate(${destination.left - from.left}px,${destination.top - from.top}px) scale(${destination.size / from.width})`}
    ], {duration: 1450, easing: 'cubic-bezier(.38,.04,.18,1)', fill: 'forwards'});
    const sky = overlay.querySelector('.flight-sky').animate([
      {opacity: 0}, {opacity: .9, offset: .45}, {opacity: 1}
    ], {duration: 1450, fill: 'forwards'});
    flight.animations.push(zoom, sky);
    try { await zoom.finished; await settle(flight); }
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
