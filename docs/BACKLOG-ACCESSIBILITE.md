# Backlog accessibilité PNMA (Front-office RA)

Cible : WCAG 2.2 niveau **AA** sur les écrans Centre d’appel (connexion, assistance, dashboard, chronogramme).

## P0 — Intégré dans le code (cette itération)
- [x] Lien d’évitement « Aller au contenu »
- [x] Focus visible renforcé (clavier)
- [x] Contraste / mode texte agrandi (préférence utilisateur)
- [x] Landmarks (`header`, `main`, `nav`) + `lang="fr"`
- [x] Regions live ARIA sur chronogramme (décompte + alerte dépassement)
- [x] Annonce vocale optionnelle du dépassement de paquet
- [x] Raccourcis clavier RA (Aide `Alt+/`)
- [x] Labels explicites sur formulaires critiques
- [x] Boutons/actions taille cible ≥ 44px sur zone RA

## P1 — Prochaine itération
- [ ] Parcours 100 % clavier audité page par page
- [ ] Contraste AAA optionnel
- [ ] Préférences persistées compte utilisateur (API)
- [ ] Guide formation NVDA/JAWS PDF accessible
- [ ] Tests utilisateurs malvoyants (2 sessions)

## P2 — Scale
- [ ] Softphone intégré accessible
- [ ] Mode high-contrast système (`prefers-contrast`)
- [ ] Réduction motion (`prefers-reduced-motion`) déjà amorcée
