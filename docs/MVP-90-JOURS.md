# PNMA — Plan MVP 90 jours (chiffré)

Périmètre : valider le prototype en conditions réelles (Dakar / Thiès), sécuriser le socle, former 2–3 agents RA, mesurer qualité d’appel et flux médical.

Devise : **FCFA** (ordres de grandeur 2026). Hors impôts/charges sociales précises.

---

## Vue d’ensemble budgétaire

| Poste | J0–30 | J31–60 | J61–90 | Total 90 j |
|-------|-------|--------|--------|------------|
| RH / prestations | 4,5 M | 5,5 M | 5,0 M | **15,0 M** |
| Infra / logiciels | 1,2 M | 0,6 M | 0,5 M | **2,3 M** |
| SSI / conformité | 0,8 M | 1,2 M | 1,5 M | **3,5 M** |
| Accessibilité & formation | 0,5 M | 0,8 M | 0,5 M | **1,8 M** |
| Contingence (10 %) | 0,7 M | 0,8 M | 0,8 M | **2,3 M** |
| **Total** | **7,7 M** | **8,9 M** | **8,3 M** | **~24,9 M** |

Fourchette réaliste : **22–30 M FCFA** selon externalisation SSI et niveau softphone.

---

## Jalons

### Phase A — J0 à J30 : Stabiliser & sécuriser
**Objectif** : prod stable, backups testés, 1 parcours RA bout-en-bout.

| Jalon | Livrable | Critère de succès |
|-------|----------|-------------------|
| A1 | Environnements (prod + préprod légère) | URL préprod distincte ou auth basique |
| A2 | PRA minimal (backup + restore testé) | Restore DB < 2 h documenté |
| A3 | MFA back-office + rotation secrets | Admin / chef / agents en MFA |
| A4 | Softphone + script RA v1 | 1 appel simulé chronométré |
| A5 | Formation agents (2 j) | 2 agents autonomes sur dashboard + chronogramme |

**Recrutements / affectations**
- 1 chef de projet métier (déjà ou mi-temps)
- 1 full-stack / DevOps (mi-temps ou forfait)
- 2 agents RA
- 1 chef d’équipe (mi-temps)

**Budget phase A** : ~7,7 M

---

### Phase B — J31 à J60 : Pilote terrain
**Objectif** : 50–100 abonnés pilotes, partenaires Dakar actifs, flux médical suivi.

| Jalon | Livrable | Critère de succès |
|-------|----------|-------------------|
| B1 | Réseau 3–5 partenaires opérationnels | Dispatch auto < 5 min médian |
| B2 | Objectifs flux médical paramétrés | Dashboard % objectif visible |
| B3 | Revue qualité hebdo (dépassements paquet) | ≥ 4 réunions documentées |
| B4 | Accessibilité RA v1 (clavier + contraste + live regions) | Checklist WCAG A passée |
| B5 | Pentest / scan vuln. léger | Rapport + correctifs P0/P1 |

**Recrutements**
- +1 agent RA (total 3)
- Prestataire SSI ponctuel (pentest)

**Budget phase B** : ~8,9 M

---

### Phase C — J61 à J90 : Industrialiser
**Objectif** : SOP figées, indicateurs fiables, go/no-go scale Année 1.

| Jalon | Livrable | Critère de succès |
|-------|----------|-------------------|
| C1 | SOP RA / SECOURS / MEDICAL | Procédures signées |
| C2 | Tableau de bord qualité (ETA, résolution, dépassements) | Rapport mensuel auto |
| C3 | PCA papier + contacts secours officiels | Liste pompiers/police/SAMU par zone |
| C4 | Décision scale (500 abonnés) | Business review |
| C5 | Plan Année 1 (infra DB managée si besoin) | Roadmap validée |

**Budget phase C** : ~8,3 M

---

## Grille RH minimale

| Rôle | Charge 90 j | Coût estimé (brut chargé / forfait) |
|------|-------------|-------------------------------------|
| Chef projet métier | 60–80 % | 3,0–4,5 M |
| Dev full-stack / DevOps | 50–70 % | 3,5–5,5 M |
| Agents RA ×2–3 | 100 % | 2,5–4,5 M |
| Chef d’équipe | 40–60 % | 1,5–2,5 M |
| SSI externe (audit + conseils) | forfait | 1,5–3,0 M |
| Formation accessibilité | forfait | 0,5–1,0 M |

---

## Checklist SSI (MVP → élevé)

### Immédiat (J0–15)
- [ ] TLS valide + renouvellement Certbot OK
- [ ] Secrets hors Git ; `.env` permissions 600
- [ ] Comptes démo changés / désactivés en prod réelle
- [ ] MFA admin + team lead
- [ ] Firewall : seuls 80/443 publics ; DB localhost
- [ ] Backup quotidien DB + hebdo code ; test restore
- [ ] Journal d’accès serveur + fail2ban

### Court terme (J16–45)
- [ ] Politique mots de passe + rotation 90 j
- [ ] Rate limiting API auth / incidents
- [ ] Journal audit applicatif conservé ≥ 12 mois
- [ ] Chiffrement backups (gpg/age)
- [ ] Inventaire traitements données personnelles
- [ ] Clause DPA prestataires (hébergeur, softphone)
- [ ] Scan dépendances npm (CI)

### Moyen terme (J46–90)
- [ ] Pentest externe + plan de correctifs
- [ ] Séparation préprod / prod
- [ ] Procédure incident de sécurité (RACI)
- [ ] Revue accès trimestrielle
- [ ] Objectif ISO 27001 light (gap analysis) si levée de fonds

---

## Postes de travail back-office (MVP)

| Élément | Spec mini | Coût unitaire |
|---------|-----------|---------------|
| PC / portable | 8 Go RAM, SSD | 250–450 k |
| Écran 24" | Full HD | 80–150 k |
| Casque + micro | USB noise-cancel | 40–100 k |
| Softphone / abonnement | 3CX cloud ou équivalent | 15–40 k/mois/poste |
| Lien internet plateau | Fibre ≥ 20 Mbps + 4G failover | 30–80 k/mois |

Pour 3 postes : **~1,2–2,0 M** capex + **~0,15–0,3 M/mois** opex telecom/softphone.

---

## Indicateurs de go/no-go (fin J90)

| KPI | Seuil go |
|-----|----------|
| Disponibilité plateforme | ≥ 99 % (hors maintenance planifiée) |
| Temps prise en charge appel | ≤ 5 min médian |
| Dépassements paquet / total appels | < 20 % (puis tendance baissière) |
| Restore backup testé | Oui, < 2 h |
| Agents autonomes | ≥ 2 |
| NPS / satisfaction pilotes | ≥ 7/10 |

---

## Suite recommandée après J90

1. DB PostgreSQL managée + object storage pièces jointes  
2. Application mobile abonné (si volume)  
3. Certification / conformité renforcée  
4. Extension Thiès → Diourbel selon roadmap commerciale
