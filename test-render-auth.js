/**
 * Script pour tester l'authentification sur Render
 * Utilisez ce script pour vérifier que les sessions fonctionnent
 */

const RENDER_URL = process.env.RENDER_URL || 'https://airbnbbot-z18h.onrender.com';
const EMAIL = 'nguilane.fall@gmail.com';
const PASSWORD = 'Admin123!';

async function testRenderAuth() {
  console.log(`🧪 Test d'authentification sur Render...\n`);
  console.log(`URL: ${RENDER_URL}\n`);

  // 1. Test de connexion
  console.log('1️⃣  Test de connexion...');
  const loginResponse = await fetch(`${RENDER_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    credentials: 'include', // Important pour envoyer les cookies
  });

  console.log(`   Status: ${loginResponse.status}`);
  console.log(`   Headers:`, Object.fromEntries(loginResponse.headers.entries()));
  
  if (!loginResponse.ok) {
    const error = await loginResponse.text();
    console.error(`   ❌ Erreur: ${error}`);
    return;
  }

  const user = await loginResponse.json();
  console.log(`   ✅ Connecté: ${user.email} (${user.id})\n`);

  // Récupérer les cookies de la réponse
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  console.log(`   Cookie reçu: ${setCookieHeader ? 'OUI' : 'NON'}`);
  if (setCookieHeader) {
    console.log(`   Cookie: ${setCookieHeader.substring(0, 50)}...\n`);
  }

  // 2. Test de récupération de l'utilisateur
  console.log('2️⃣  Test de récupération de l\'utilisateur...');
  const userResponse = await fetch(`${RENDER_URL}/api/user`, {
    method: 'GET',
    credentials: 'include', // Important pour envoyer les cookies
  });

  console.log(`   Status: ${userResponse.status}`);
  
  if (!userResponse.ok) {
    const error = await userResponse.text();
    console.error(`   ❌ Erreur: ${error}`);
    console.error(`   ⚠️  La session n'est pas maintenue !\n`);
    return;
  }

  const currentUser = await userResponse.json();
  console.log(`   ✅ Utilisateur récupéré: ${currentUser.email}\n`);

  // 3. Test de récupération des propriétés
  console.log('3️⃣  Test de récupération des propriétés...');
  const propertiesResponse = await fetch(`${RENDER_URL}/api/properties`, {
    method: 'GET',
    credentials: 'include', // Important pour envoyer les cookies
  });

  console.log(`   Status: ${propertiesResponse.status}`);
  
  if (!propertiesResponse.ok) {
    const error = await propertiesResponse.text();
    console.error(`   ❌ Erreur: ${error}`);
    console.error(`   ⚠️  Impossible de récupérer les propriétés !\n`);
    return;
  }

  const properties = await propertiesResponse.json();
  console.log(`   ✅ Propriétés récupérées: ${properties.length}`);
  properties.forEach((prop: any, index: number) => {
    console.log(`      ${index + 1}. ${prop.name}`);
  });
  console.log('');

  // 4. Test de création de propriété
  console.log('4️⃣  Test de création de propriété...');
  const createResponse = await fetch(`${RENDER_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Test Property',
      description: 'Test',
      address: 'Test Address',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      houseRules: '',
      hostName: 'Test Host',
      amenities: [],
    }),
    credentials: 'include', // Important pour envoyer les cookies
  });

  console.log(`   Status: ${createResponse.status}`);
  
  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error(`   ❌ Erreur: ${error}`);
    console.error(`   ⚠️  Impossible de créer une propriété !\n`);
    return;
  }

  const newProperty = await createResponse.json();
  console.log(`   ✅ Propriété créée: ${newProperty.name} (${newProperty.id})\n`);

  console.log('✅ Tous les tests sont passés !');
}

testRenderAuth()
  .catch((error) => {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  });

