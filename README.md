# Sointuseuraaja

Selainsovellus, joka näyttää kappaleen soinnut ja sanat ja seuraa soittoa mikrofonin kautta: nykyinen sointu korostuu ja sanat vierivät itsestään.

**Käyttö:** https://vivimedi-cloud.github.io/sointuseuraaja/

- Toimii puhelimessa, tabletissa ja tietokoneella. Puhelimessa "Lisää aloitusnäyttöön" asentaa sen sovellukseksi.
- ⭐-napista saa kirjanmerkin, joka avaa seuraajan suoraan Ultimate Guitarin kappalesivun päälle.
- Kappaleet tallentuvat selaimeen.

## Kehitys

Lähde on `src/src.html`. `npm install && npm run build` tuottaa `index.html`:n ja `kirjanmerkki.txt`:n.
`npm test` soittaa demoääntä eri tilanteissa (tasainen tahti, vaihtelevat pituudet, väärä sointu välissä, rivin toisto) ja raportoi seurannan osuvuuden (vaatii Playwrightin).
