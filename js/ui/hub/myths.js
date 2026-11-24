/** Myths vs facts tab: flip cards with a "busted" counter. */
import { MYTHS } from '../../data/content.js';
import { $ } from '../../dom.js';

/** @type {Set<number>} */
const flipped = new Set();

const updateCount = () => ($('mythCount').textContent = `${flipped.size} of ${MYTHS.length} busted.`);

export function renderMyths() {
  $('myths').innerHTML = MYTHS.map(
    (x, i) => `
    <button class="flip ${flipped.has(i) ? 'on' : ''} text-left" data-m="${i}" aria-pressed="${flipped.has(i)}">
      <div class="flip-inner">
        <div class="face glass flex flex-col justify-between rounded-3xl p-5">
          <span class="w-fit rounded-full bg-blush-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-ink">Myth</span>
          <p class="text-base font-semibold text-ink">“${x.m}”</p>
          <span class="text-[11px] text-ink2">Tap to reveal the fact</span>
        </div>
        <div class="face back flex flex-col justify-between rounded-3xl border border-sage bg-sage-50 p-5">
          <span class="w-fit rounded-full bg-sage/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sage-ink">Fact</span>
          <p class="text-sm leading-relaxed text-ink">${x.f}</p>
          <span class="text-[11px] text-sage-ink">Tap to flip back</span>
        </div>
      </div>
    </button>`,
  ).join('');
  updateCount();
  $('myths')
    .querySelectorAll('.flip')
    .forEach((/** @type {any} */ card) =>
      card.addEventListener('click', () => {
        const i = +card.dataset.m;
        if (flipped.has(i)) flipped.delete(i);
        else flipped.add(i);
        card.classList.toggle('on');
        card.setAttribute('aria-pressed', String(flipped.has(i)));
        updateCount();
      }),
    );
}
