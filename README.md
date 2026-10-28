# Khmer Wedding Invitation (React + Vite)

## Run
    npm install
    npm run dev        # local preview
    npm run build      # production build -> dist/

## How it opens
1. Lotus loader, then an olive-paper envelope with the gold wax seal.
2. Guest taps the seal: the music starts, the flap opens, the envelope lifts away.
3. The hero animates in (crest, names, date) and gold butterflies drift across.
4. A round gold button (bottom-right) is play / close for the music.
   (Browsers block sound until a tap, so the seal tap is what starts it.)


## Guest name in the link
Put the guest name at the end of the URL and it fills the name box on the cover:

    https://your-site.vercel.app/ដារ៉ា
    https://your-site.vercel.app/?name=ដារ៉ា     (also works)

Guests can also type or change the name in the box; the address bar updates to match.
`vercel.json` already rewrites every path to the app, so these links work after deploying.

## Customize
- Text (Khmer + English), date, venue, schedule, links, image paths: `src/config.js`
- Photos: replace the placeholders in `public/img/`
- Music: replace `public/audio/music.mp3` with your own song (same name), or change `music.src` in `src/config.js`
- Colors / fonts: CSS variables at the top of `src/styles.css`
- Gold foil colors: edit the "g-foil" gradient inside the SVGs in `public/kit/elements/`

## Credit
Design elements and paper textures: Khmer E-Invitation Starter Kit by Someth Phay (somethphay.me).
The kit asks that the credit stays; it is in the footer.
The included music.mp3 is a generated placeholder loop.

## Deploy
Push to GitHub and import into Vercel (preset: Vite), or run `npx vercel`.
