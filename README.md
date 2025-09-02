# Marius' Epic Budsjettkalkulator

En enkel og lokal-testbar budsjettkalkulator skrevet i HTML, CSS og JavaScript. Designet for å fungere direkte via `file://` på GitHub Pages eller lokalt.

## Features

- **Legg til utgifter/inntekter**: Fyll inn beskrivelse, beløp og dato, og trykk "legg til".  
- **Datoformat**: Støtter numerisk (f.eks `20`) som fyller dagens måned, eller `dd/mmm`-format.  
- **+14d-knapp per rad**: Dupliser en rad 14 dager frem i tid.  
- **Sortering**: Sorter listen etter dato, beløp eller beskrivelse via dropdown. Listen sorteres automatisk når nye elementer legges til.  
- **"Til overs" sum**: Viser total saldo. Fargen endres etter beløpet: grønn = positiv, rød = negativ, gul = null. Vises kun når minst én rad finnes.  
- **Enter-support**: Trykk `Enter` for å automatisk legge til raden.  
- **Popup-hjelp**: ?-knapp åpner en enkel veiledning.  
- **Responsivt design**: Tilpasser seg til mobil og desktop.  
- **Tema & styling**: Gradient i tittel, fargekodede beløp, enkel og mørk design.  
- **Animert innlegging**: Nye rader fades inn for bedre visuell feedback.  
- **Full lokal testing**: Alt fungerer via `file://` uten behov for server eller imports.  

## Bruk

1. Åpne `index.html` i nettleseren din.  
2. Fyll ut beskrivelse, beløp og dato.  
3. Klikk "legg til" eller trykk `Enter`.  
4. Bruk sortering for å se listen etter ønsket kriterium.  
5. Trykk +14d på en rad for å kopiere den 14 dager frem.  
6. ?-knappen viser popup med forklaring.  

## Filstruktur

