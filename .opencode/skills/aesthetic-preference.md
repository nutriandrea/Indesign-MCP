---
name: aesthetic-preference
description: Raccolta e comprensione delle preferenze estetiche del cliente prima di operare su InDesign
triggers:
  - "crea pagina"
  - "impagina"
  - "design"
  - "estetica"
  - "stile"
  - "layout"
  - "nuovo progetto"
---

# Skill: Preferenze Estetiche del Cliente

## Scopo

Prima di iniziare qualsiasi operazione creativa o modifica grafica in Adobe InDesign, l'agente deve raccogliere informazioni sulle preferenze estetiche del cliente tramite domande mirate. L'obiettivo è costruire progressivamente un **profilo estetico persistente** che guidi tutte le modifiche successive.

## Processo Obbligatorio

### 1. Raccolta Iniziale (prima del primo task creativo)

Prima di creare/modificare qualsiasi pagina, poni queste domande all'utente. NON procedere senza aver ricevuto risposta almeno a 5 domande su 8.

| # | Domanda | Esempio di risposta |
|---|---------|-------------------|
| 1 | **Font/Tipografia**: Che font preferisci? Hai una gerarchia tipografica (titoli, sottotitoli, corpo)? | "Arial Bold per titoli, Helvetica per corpo" |
| 2 | **Palette Colori**: Che colori vuoi usare? Hai codici esadecimali o RGB? | "Blu #1a3a5c, Rosso #d92626, Bianco" |
| 3 | **Stile Visivo**: Che stile descrive meglio ciò che vuoi? | "Minimal / Bauhaus / Futurista / Corporate / Luxury / Moderno / Vintage" |
| 4 | **Formato Pagina**: Che dimensioni e orientamento? | "A4 ritratto / A3 orizzontale / 100x150mm" |
| 5 | **Margini e Spaziature**: Che margine vuoi intorno ai contenuti? | "15mm simmetrici / 20mm sinistro, 10mm destro" |
| 6 | **Gerarchia Visiva**: Cosa deve risaltare di più? Ordine di importanza? | "1. Titolo, 2. Nome, 3. Sottotitolo, 4. Corpo" |
| 7 | **Riferimenti**: Hai esempi di design che ti piacciono? | "Il sito di X, il poster di Y" |
| 8 | **Vincoli**: Cosa NON vuoi assolutamente? | "Niente gradienti, niente foto, solo geometrico" |

### 2. Profilo Estetico Persistente

Dopo la raccolta, crea un **profilo strutturato** salvato in `.sisyphus/context/aesthetic-profile.json`:

```json
{
  "cliente": "Nome cliente (se noto)",
  "ultimo_aggiornamento": "2026-06-04",
  "font": {
    "titoli": { "family": "Arial", "style": "Bold", "sizeMin": 18, "sizeMax": 48 },
    "sottotitoli": { "family": "Arial", "style": "Regular", "sizeMin": 12, "sizeMax": 18 },
    "corpo": { "family": "Arial", "style": "Regular", "sizeMin": 8, "sizeMax": 12 }
  },
  "colori": {
    "primario": "#1a3a5c",
    "secondario": "#d92626",
    "accento": "#f5a623",
    "sfondo": "#ffffff",
    "testo": "#000000"
  },
  "stile": "bauhaus",
  "pagina": { "larghezza": 210, "altezza": 297, "unita": "mm" },
  "margini": { "top": 15, "bottom": 15, "left": 20, "right": 20 },
  "riferimenti": [],
  "vincoli": ["niente gradienti", "solo geometrico"]
}
```

### 3. Aggiornamento Continuo

- Dopo ogni iterazione, chiedi all'utente: *"C'è qualcosa che vuoi aggiungere o cambiare nelle preferenze estetiche?"*
- Se l'utente approva un design, registra il risultato come **riferimento positivo** nel profilo.
- Se l'utente rifiuta, registra il **motivo del rifiuto** nel profilo (`rifiuti: [{design: "bauhaus v1", motivo: "testo su sfondo illeggibile"}]`).

## Regole d'Oro

1. **MAI** iniziare un task creativo senza almeno 5 risposte.
2. **MAI** usare default arbitrari (es. "uso Arial perché non so cosa mettere").
3. **SEMPRE** chiedere chiarimenti se la risposta è ambigua.
4. **SEMPRE** salvare il profilo dopo ogni modifica significativa.
5. **SE** l'utente dice "fai come vuoi", usa uno stile minimale pulito e documentalo.
