# Erasmus+ Satzimport Export

Statisches Hub-Modul zur Pflege von Erasmus+ Foerderpauschalen-Vorlagen.

## Verwendung im Hub

Den Ordner `Erasmus_plus_Satzimport_export` im Lesezeichen-Hub als lokales Modul hinzufuegen. Danach kann die Oberflaeche ueber den Hub geoeffnet werden.

## Was die Oberflaeche kann

- vorhandene Pauschalen-JSON anzeigen
- eigene JSON-Vorlage laden und pruefen
- Vorlage fuer die Erasmus+ Management-App exportieren
- Quelle, Laenderanzahl und Distanzbaender sichtbar machen

## Online-Abruf

Der Online-Abruf laeuft bewusst nicht in der Schul-App, sondern als separates Node-Tool:

```powershell
cd C:\Users\winzi\Documents\Erasmus_plus_Satzimport_export
node fetch_grant_templates.js
```

Das erzeugt eine Datei im Format:

```text
erasmus-plus-foerderpauschalen-YYYY-MM-DD.json
```

Diese Datei kann in der Erasmus+ Management-App im Admin-Bereich ueber `Vorlage importieren` geladen werden.

