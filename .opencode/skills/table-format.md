---
name: table-format
description: Creazione, styling e formattazione di tabelle in InDesign — colonne, righe, celle, bordi, sfondi
triggers:
  - "tabella"
  - "table"
  - "griglia"
  - "colonne"
  - "righe"
  - "cella"
  - "bordi"
  - "sfondo tabella"
  - "formatta tabella"
  - "stile tabella"
---

# Skill: Table Format — Tabelle InDesign

## Scopo

Creare tabelle strutturate e ben formattate in InDesign, con controllo su colonne, righe, bordi, sfondi, allineamento testo e stili.

## Workflow

```
CREA tabella → DIMENSIONA colonne/righe → STILA bordi → STILA sfondi → POPOLA celle → VERIFICA
```

## Step 1: Crea tabella

Tool: `table_create`

```extendscript
// Crea tabella su pagina corrente
var tabella = app.activeDocument.pages[0].tables.add({
    columnCount: 4,
    bodyRowCount: 10,
    headerRowCount: 1
});

// Posiziona tabella in un text frame
var tf = app.activeDocument.pages[0].textFrames.add();
tf.geometricBounds = ["30mm", "20mm", "200mm", "180mm"];
var tabella = tf.tables.add({
    columnCount: 4,
    bodyRowCount: 10,
    headerRowCount: 1
});
```

**Parametri:**
| Parametro | Default | Descrizione |
|---|---|---|
| `columnCount` | 3 | Numero colonne |
| `bodyRowCount` | 5 | Righe corpo |
| `headerRowCount` | 1 | Righe intestazione (0 = no header) |
| `footerRowCount` | 0 | Righe footer |

## Step 2: Dimensiona colonne e righe

```extendscript
var tabella = app.activeDocument.pages[0].tables[0];

// Larghezza colonne (in mm)
tabella.columns[0].width = "30mm";
tabella.columns[1].width = "50mm";
tabella.columns[2].width = "30mm";
tabella.columns[3].width = "40mm";

// Altezza righe
tabella.rows[0].height = "15mm";  // header più alto
for (var r = 1; r < tabella.rows.length; r++) {
    tabella.rows[r].height = "8mm";
}

// Larghezza automatica proporzionale
tabella.preferredWidth = "180mm";  // larghezza totale
// Le colonne si dividono proporzionalmente
```

### Pattern: colonne con pesi diversi

```extendscript
// Assegna peso a ogni colonna (proporzioni)
var pesi = [10, 30, 20, 40];  // totale = 100
var larghezzaTotale = 180;  // mm
for (var c = 0; c < tabella.columns.length; c++) {
    tabella.columns[c].width = (larghezzaTotale * pesi[c] / 100) + "mm";
}
```

## Step 3: Stila bordi

```extendscript
var tabella = app.activeDocument.pages[0].tables[0];

// Formato colore (carta) - assicurati che il nero esista
var nero = app.activeDocument.colors.item("Black");

// Rimuovi tutti i bordi esistenti
tabella.strokeWeight = 0;
tabella.strokeColor = nero;

// Bordo esterno: 1pt nero
tabella.topStrokeWeight = 1;
tabella.bottomStrokeWeight = 1;
tabella.leftStrokeWeight = 1;
tabella.rightStrokeWeight = 1;
tabella.topStrokeColor = nero;
tabella.bottomStrokeColor = nero;
tabella.leftStrokeColor = nero;
tabella.rightStrokeColor = nero;

// Bordo intestazione: 0.5pt sotto la prima riga
tabella.rows[0].bottomStrokeWeight = 0.75;
tabella.rows[0].bottomStrokeColor = nero;

// Bordi interni: 0.3pt grigi
tabella.alternateStrokeWeights = false;
```

### Pattern rapidi

| Stile | Bordo esterno | Bordi interni | Header |
|---|---|---|---|
| **Minimal** | Nessuno | Nessuno | Linea spessa sotto |
| **Grid** | 1pt nero | 0.3pt grigio 30% | Come corpo |
| **Invoice** | 0.75pt nero | 0.3pt grigio | Sfondo grigio chiaro |
| **Clean** | 0.5pt nero | Nessuno | Sfondo + bordo sotto |

## Step 4: Stila sfondi

```extendscript
// Sfondo header
var headerColor = app.activeDocument.colors.item("Blu Primario");
if (!headerColor.isValid) {
    headerColor = app.activeDocument.colors.add({
        name: "Blu Primario",
        model: ColorModel.PROCESS,
        // Crea colore
    });
}
tabella.rows[0].fillColor = headerColor;

// Sfondo alternato righe corpo
tabella.rows[1].fillColor = app.activeDocument.colors.item("Grigio 10%");

// via script per alternanza
for (var r = 1; r < tabella.rows.length; r++) {
    if (r % 2 === 1) {
        tabella.rows[r].fillColor = app.activeDocument.colors.item("Grigio 10%");
    } else {
        tabella.rows[r].fillColor = app.activeDocument.colors.item("White");
    }
}
```

## Step 5: Popola celle

Tool: `table_setCell`

```extendscript
// Per cella singola
tabella.rows[r].cells[c].contents = "Testo cella";

// Font e dimensione
tabella.rows[0].cells[0].contents = "Intestazione";
tabella.rows[0].cells[0].pointSize = 11;
tabella.rows[0].cells[0].appliedFont = "Arial";
tabella.rows[0].cells[0].fontStyle = "Bold";

// Allineamento
tabella.rows[0].cells[0].justification = Justification.CENTER_ALIGN;
tabella.rows[0].cells[0].verticalJustification = VerticalJustification.CENTER_ALIGN;

// Padding cella
tabella.rows[0].cells[0].topInset = "1mm";
tabella.rows[0].cells[0].bottomInset = "1mm";
tabella.rows[0].cells[0].leftInset = "2mm";
tabella.rows[0].cells[0].rightInset = "2mm";
```

### Popolamento massivo

```extendscript
var dati = [
    ["Nome", "Quantità", "Prezzo", "Totale"],
    ["Prodotto A", "5", "10.00", "50.00"],
    ["Prodotto B", "3", "15.00", "45.00"],
];

for (var r = 0; r < dati.length; r++) {
    for (var c = 0; c < dati[r].length; c++) {
        tabella.rows[r].cells[c].contents = dati[r][c];
    }
}
```

## Step 6: Operazioni avanzate

### Unisci celle (merge)
```extendscript
var cella1 = tabella.rows[0].cells[0];
var cella2 = tabella.rows[0].cells[1];
cella1.merge(cella2);
```

### Aggiungi riga/colonna
```extendscript
// Tool: table_addRow, table_addColumn
tabella.rows.add(LocationOptions.AFTER, tabella.rows.last());
tabella.columns.add(LocationOptions.AFTER, tabella.columns.last());
```

### Elimina riga/colonna
```extendscript
// Tool: table_deleteRow, table_deleteColumn
tabella.rows[2].remove();
tabella.columns[1].remove();
```

## Verifica finale

| Check | Cosa controllare |
|---|---|
| Allineamento | Testo intestazione centrato, corpo allineato a sinistra |
| Bordi | Nessun bordo mancante, spessore uniforme |
| Overflow | Nessuna cella con testo troncato (usa layout-readability) |
| Header su più pagine | Se tabella gira, header si ripete? |
| Larghezza tabella | Non supera la larghezza della pagina |

## Casi noti

| Problema | Soluzione |
|---|---|
| Tabella esce dalla pagina | Riduci larghezza colonne o font size |
| Testo troncato in cella | Aumenta altezza riga o riduci font |
| Bordo non visibile | Verifica colore esista e strokeWeight > 0 |
| Merge non funziona | Solo celle adiacenti nella stessa riga |
| Header non si ripete | `tabella.headerRowCount = 1` dopo la creazione |
