// Image arrival (MOTION-CHALLENGE 2.8). Images marked data-decode stay
// transparent over their placeholder ground (.ph, --ph) and fade in over 400ms
// once decode() resolves. Without JS, or if anything fails, they simply show.
//   <div class="ph" style="--ph:url(data:…)"><img data-decode src=… width=… height=… alt=…></div>
//   decodeFade(root)
export function decodeFade(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>('img[data-decode]:not(.is-loaded)').forEach((img) => {
    const show = () => img.classList.add('is-loaded')
    const go = () => (img.decode ? img.decode().then(show, show) : show())
    if (img.complete && img.naturalWidth) go()
    else {
      img.addEventListener('load', go, { once: true })
      img.addEventListener('error', show, { once: true })
    }
  })
}
