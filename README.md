# PNMA — Plateforme Numérique de Mobilité et d’Assistance

Orchestrateur d’assistance routière au Sénégal : centre d’appel 24/7, réseau de partenaires, remorquage, préfinancement médical, assurance automobile et pilotage par IA.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15, Tailwind, Manrope / Barlow Condensed |
| Backend | NestJS 10, Prisma, JWT, Swagger |
| Database | PostgreSQL 16 |
| Déploiement | PM2 + Nginx + Certbot (certificat dédié) ou Docker Compose |

## Fonctionnalités

- Réception des demandes d’assistance
- Géolocalisation des abonnés
- Identification automatique du partenaire le plus proche
- Suivi des interventions en temps réel
- Gestion des contrats d’assurance partenaires
- Préfinancements médicaux d’urgence
- Indicateurs stratégiques (dashboard)
- Optimisation opérationnelle par IA (dispatch + insights réseau)
- Offres Niveau 1 / Niveau 2
- Formations aux premiers secours

## Démarrage local

```bash
cp .env.example .env
docker compose up -d --build
```

- Site : http://localhost:3010
- API : http://localhost:4010/api
- Swagger : http://localhost:4010/api/docs

## Comptes démo

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@pnma.2ticglobal.com` | `PnmaAdmin!2026` |
| Centre d’appel | `callcenter@pnma.2ticglobal.com` | `CallCenter!2026` |
| Abonné | `abonne@pnma.2ticglobal.com` | `Abonne!2026` |
| Partenaire | `garage.almadies@pnma.sn` | `Partenaire!2026` |

## Déploiement VPS (`pnma.2ticglobal.com`)

```bash
# Sur le VPS (root)
bash scripts/deploy-vps-native.sh
```

Le script configure Nginx, PM2, PostgreSQL et un **certificat SSL séparé** via Certbot pour `pnma.2ticglobal.com`.

## Repos

- Monorepo : https://github.com/Padojadi/pnma
- Backend : https://github.com/Padojadi/pnma-backend
- Frontend : https://github.com/Padojadi/pnma-frontend

## Copie locale Mac

```bash
bash scripts/setup-local.sh "/Users/Paul Do Mac Folders/Protosen_Hostinger/PNMA"
```

## Vision (extrait résumé exécutif)

Devenir la référence nationale puis régionale de l’assistance routière et de la protection du conducteur — couverture progressive Dakar → Thiès → nationale, modèle d’abonnement récurrent.
