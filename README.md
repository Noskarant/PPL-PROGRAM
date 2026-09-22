# PPL Program

Application web ludique de préparation au **PPL(A)**, construite à partir du manuel `Préparation PPL(A) sur DR400 — 26 semaines, 104 séances de 30 minutes`.

## Objectif

Transformer un manuel dense en parcours d’apprentissage progressif :

- 26 semaines / 6 mois
- 104 séances guidées de 30 minutes
- objectif de 2 h par semaine
- cours complets issus du manuel
- contrôles hebdomadaires avec correction
- plus de 50 QCM interactifs corrigés
- 60 questions de grand oral
- ateliers cockpit, METAR, radio et vent
- missions FS2024
- XP, niveaux, badges et streaks
- répétition espacée
- suivi des erreurs
- notes personnelles
- deux profils locaux par défaut : Noé et Kélian
- export / import JSON de toute la progression
- fonctionnement PWA et cache hors ligne

## Données et confidentialité

Aucun compte et aucun backend.

La progression est enregistrée dans **IndexedDB**, directement dans le navigateur. Rien n’est envoyé à Supabase ou à un serveur applicatif.

Pensez à utiliser régulièrement **Profil → Exporter JSON**. Effacer les données du navigateur peut supprimer la progression locale.

## Lancer en local

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
npm run preview
```

## GitHub Pages

Le workflow `.github/workflows/deploy.yml` compile automatiquement l’application lors d’un push sur `main`.

Le projet Vite utilise la base :

```
/PPL-PROGRAM/
```

Dans GitHub, activer si nécessaire **Settings → Pages → Source: GitHub Actions**.

## Structure

```
src/
  App.tsx                  # écrans, parcours, quiz, progression
  components/Learning.tsx # rendu du cours + laboratoires interactifs
  data/training.ts        # QCM, METAR, radio, missions, badges
  lib/course.ts           # transformation du manuel en 26 semaines / 104 séances
  lib/progress.ts         # progression, maîtrise et répétition espacée
  lib/storage.ts          # IndexedDB, profils et sauvegardes
  content/manual-*.md     # contenu source du manuel PPL
```

## Sécurité aéronautique

PPL Program est un **support de préparation personnelle**.

Il ne remplace pas :

- un instructeur FI(A) ;
- une formation DTO/ATO ;
- le manuel de vol / AFM de l’avion utilisé ;
- la checklist approuvée ;
- les publications aéronautiques et météo à jour ;
- les privilèges associés à une licence ou qualification.

La famille DR400 comporte plusieurs variantes. Les vitesses, masses, limitations, quantités, performances et procédures propres à un appareil doivent être apprises à partir de la documentation de l’avion réellement exploité.

FS2024 est utilisé ici comme **laboratoire pédagogique**, pas comme validation d’une compétence de pilotage réelle.

## Sources pédagogiques du manuel

Le contenu importé s’appuie notamment sur :

- EASA — Easy Access Rules for Aircrew
- DGAC / DSNA — SERA
- DGAC / DSNA — Manuel de phraséologie
- Météo-France — Guide aviation
- SIA — Atlas VAC et cartes OACI 1:500 000
- manuels PPL/LAPL français récents cités dans le manuel source

Les sources et liens détaillés restent présents dans le contenu du manuel embarqué.

## Licence

Projet personnel d’apprentissage. Les formulations pédagogiques intégrées sont originales et ne reproduisent pas les ouvrages commerciaux de référence.
