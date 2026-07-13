import { PrismaClient, OfferLevel, PartnerType, PartnerStatus, UserRole, IncidentType, IncidentStatus, Priority } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

// Load .env if present (ts-node seed)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pnma.2ticglobal.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'PnmaAdmin!2026';

  const niveau1 = await prisma.offerPlan.upsert({
    where: { level: OfferLevel.NIVEAU_1 },
    update: { replacementVehicleIncluded: false },
    create: {
      level: OfferLevel.NIVEAU_1,
      name: 'Offre Niveau 1',
      annualPriceFcfa: 75000,
      medicalCeilingFcfa: 200000,
      priorityIntervention: false,
      premiumAssistance: false,
      adminSupport: false,
      replacementVehicleIncluded: false,
      description: 'Assistance téléphonique 24/7, coordination dépannage, réseau de garages, préfinancement médical plafonné à 200 000 FCFA.',
    },
  });

  const niveau2 = await prisma.offerPlan.upsert({
    where: { level: OfferLevel.NIVEAU_2 },
    update: { replacementVehicleIncluded: true },
    create: {
      level: OfferLevel.NIVEAU_2,
      name: 'Offre Niveau 2',
      annualPriceFcfa: 150000,
      medicalCeilingFcfa: 500000,
      priorityIntervention: true,
      premiumAssistance: true,
      adminSupport: true,
      replacementVehicleIncluded: true,
      description: 'Priorité d’intervention, assistance premium, véhicule de remplacement, préfinancement médical plafonné à 500 000 FCFA.',
    },
  });

  const hash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hash },
    create: {
      email: adminEmail,
      password: hash,
      firstName: 'Admin',
      lastName: 'PNMA',
      phone: '+221770000001',
      role: UserRole.ADMIN,
    },
  });

  const callHash = await bcrypt.hash('CallCenter!2026', 10);
  const callCenter = await prisma.user.upsert({
    where: { email: 'callcenter@pnma.2ticglobal.com' },
    update: {},
    create: {
      email: 'callcenter@pnma.2ticglobal.com',
      password: callHash,
      firstName: 'Aïssatou',
      lastName: 'Diop',
      phone: '+221770000002',
      role: UserRole.CALL_CENTER,
    },
  });

  const leadHash = await bcrypt.hash('TeamLead!2026', 10);
  await prisma.user.upsert({
    where: { email: 'chef@pnma.2ticglobal.com' },
    update: {},
    create: {
      email: 'chef@pnma.2ticglobal.com',
      password: leadHash,
      firstName: 'Ibrahima',
      lastName: 'Sarr',
      phone: '+221770000003',
      role: UserRole.TEAM_LEAD,
    },
  });

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  await prisma.medicalBudgetConfig.deleteMany({ where: { year } });
  await prisma.medicalBudgetConfig.createMany({
    data: [
      { year, month, region: null, objectiveFcfa: 5_000_000, label: 'Objectif mensuel national flux médical' },
      { year, month: null, region: null, objectiveFcfa: 50_000_000, label: 'Objectif annuel national flux médical' },
      { year, month, region: 'Dakar', objectiveFcfa: 3_000_000, label: 'Objectif mensuel Dakar' },
      { year, month, region: 'Thiès', objectiveFcfa: 1_000_000, label: 'Objectif mensuel Thiès' },
    ],
  });

  const subHash = await bcrypt.hash('Abonne!2026', 10);
  const subscriber = await prisma.user.upsert({
    where: { email: 'abonne@pnma.2ticglobal.com' },
    update: {},
    create: {
      email: 'abonne@pnma.2ticglobal.com',
      password: subHash,
      firstName: 'Moussa',
      lastName: 'Ndiaye',
      phone: '+221770000010',
      role: UserRole.SUBSCRIBER,
      latitude: 14.7167,
      longitude: -17.4677,
      lastLocationAt: new Date(),
      subscriberProfile: {
        create: {
          city: 'Dakar',
          region: 'Dakar',
          address: 'Almadies, Dakar',
          vehiclePlate: 'DK-4521-AB',
          vehicleBrand: 'Toyota',
          vehicleModel: 'Corolla',
          vehicleYear: 2019,
          emergencyContact: '+221770000099',
          subscriptions: {
            create: {
              offerPlanId: niveau2.id,
              status: 'ACTIVE',
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    },
    include: { subscriberProfile: true },
  });

  const partners = [
    {
      email: 'garage.almadies@pnma.sn',
      businessName: 'Garage Almadies Express',
      type: PartnerType.MECHANIC,
      city: 'Dakar',
      latitude: 14.7442,
      longitude: -17.5253,
      specialties: ['moteur', 'batterie', 'pneus'],
    },
    {
      email: 'remorque.plateau@pnma.sn',
      businessName: 'Remorquage Plateau 24/7',
      type: PartnerType.TOWING,
      city: 'Dakar',
      latitude: 14.6928,
      longitude: -17.4467,
      specialties: ['remorquage', 'accident'],
    },
    {
      email: 'garage.thies@pnma.sn',
      businessName: 'Auto Service Thiès',
      type: PartnerType.BOTH,
      city: 'Thiès',
      latitude: 14.7886,
      longitude: -16.926,
      specialties: ['dépannage', 'remorquage'],
    },
    {
      email: 'mecano.parcelles@pnma.sn',
      businessName: 'Mécano Parcelles Assainies',
      type: PartnerType.MECHANIC,
      city: 'Dakar',
      latitude: 14.7645,
      longitude: -17.399,
      specialties: ['électrique', 'climatisation'],
    },
  ];

  for (const p of partners) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });
    if (existing) continue;
    const pwd = await bcrypt.hash('Partenaire!2026', 10);
    await prisma.user.create({
      data: {
        email: p.email,
        password: pwd,
        firstName: p.businessName.split(' ')[0],
        lastName: 'Partenaire',
        phone: '+22177' + Math.floor(1000000 + Math.random() * 8999999),
        role: UserRole.PARTNER,
        latitude: p.latitude,
        longitude: p.longitude,
        lastLocationAt: new Date(),
        partnerProfile: {
          create: {
            businessName: p.businessName,
            type: p.type,
            status: PartnerStatus.AVAILABLE,
            city: p.city,
            latitude: p.latitude,
            longitude: p.longitude,
            coverageKm: 35,
            specialties: p.specialties,
            rating: 4.4 + Math.random() * 0.5,
            phone: '+22177' + Math.floor(1000000 + Math.random() * 8999999),
          },
        },
      },
    });
  }

  const insurers = [
    { name: 'ASSUR Senegal', code: 'ASSUR', phone: '+221338200001', email: 'partenariat@assur.sn' },
    { name: 'NSIA Auto', code: 'NSIA', phone: '+221338200002', email: 'auto@nsia.sn' },
    { name: 'SUNU Assurance', code: 'SUNU', phone: '+221338200003', email: 'auto@sunu.sn' },
  ];
  for (const i of insurers) {
    await prisma.insurancePartner.upsert({
      where: { code: i.code },
      update: {},
      create: i,
    });
  }

  const trainingCount = await prisma.trainingSession.count();
  if (trainingCount === 0) {
    await prisma.trainingSession.createMany({
      data: [
        {
          title: 'Premiers secours routiers — Module 1',
          description: 'Gestes qui sauvent sur la voie publique',
          city: 'Dakar',
          location: 'Centre PNMA Plateau',
          startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          capacity: 25,
        },
        {
          title: 'Sécurité conducteur & prévention',
          description: 'Bonnes pratiques et réflexes d’urgence',
          city: 'Thiès',
          location: 'Maison de la Culture',
          startsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          capacity: 20,
        },
      ],
    });
  }

  const incidentCount = await prisma.incident.count();
  if (incidentCount === 0 && subscriber.subscriberProfile) {
    const partner = await prisma.partnerProfile.findFirst({ where: { city: 'Dakar', type: { in: ['MECHANIC', 'BOTH'] } } });
    await prisma.incident.create({
      data: {
        reference: 'INC-DEMO-0001',
        type: IncidentType.BREAKDOWN,
        status: IncidentStatus.ASSIGNED,
        priority: Priority.NORMAL,
        description: 'Panne moteur sur la VDN — véhicule immobilisé',
        latitude: 14.73,
        longitude: -17.48,
        address: 'VDN, face Sea Plaza',
        city: 'Dakar',
        reporterId: subscriber.id,
        assignedPartnerId: partner?.id,
        distanceKm: 4.2,
        estimatedEtaMin: 18,
        updates: {
          create: [
            {
              authorId: callCenter.id,
              status: IncidentStatus.RECEIVED,
              message: 'Appel reçu au centre national PNMA',
            },
            {
              authorId: callCenter.id,
              status: IncidentStatus.ASSIGNED,
              message: 'Partenaire le plus proche assigné',
            },
          ],
        },
      },
    });
  }

  console.log('PNMA seed OK');
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log('Call center: callcenter@pnma.2ticglobal.com / CallCenter!2026');
  console.log('Chef équipe: chef@pnma.2ticglobal.com / TeamLead!2026');
  console.log('Abonné: abonne@pnma.2ticglobal.com / Abonne!2026');
  console.log(`Offers: ${niveau1.name}, ${niveau2.name}`);
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
