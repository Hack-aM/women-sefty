const { onRequest, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Twilio Config fallback via environment variables or hardcoded test values
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER || '';

let twilioClient = null;
if (TWILIO_SID && TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = require('twilio')(TWILIO_SID, TWILIO_AUTH_TOKEN);
  } catch (err) {
    logger.error('Failed to initialize Twilio client:', err);
  }
}

/**
 * Triggered when a new SOS alert is registered in Firestore.
 * Sends SMS notifications via Twilio and push notifications via FCM to contacts.
 */
exports.onSOSCreated = onDocumentCreated('sos_alerts/{alertId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.warn('No snapshot data found.');
    return null;
  }

  const alertData = snapshot.data();
  const { uid, location } = alertData;
  const alertId = event.params.alertId;

  logger.info(`🚨 SOS alert created: ${alertId} by user: ${uid}`);

  try {
    // 1. Fetch user profile
    const userDoc = await db.collection('users').doc(uid).get();
    const userProfile = userDoc.exists ? userDoc.data() : {};
    const senderName = userProfile.displayName || 'A SafeHer User';

    // Construct maps link
    const mapsLink = location
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : 'Coordinates unavailable';

    const alertMessage = `🚨 EMERGENCY! ${senderName} has triggered an SOS alert on SafeHer. Please check on them immediately. Location: ${mapsLink}`;

    // 2. Fetch emergency contacts
    const contactsSnap = await db.collection('users').doc(uid).collection('contacts').get();
    const contacts = contactsSnap.docs.map(doc => doc.data());

    if (contacts.length === 0) {
      logger.warn(`No emergency contacts configured for user ${uid}.`);
    }

    const notificationPromises = [];

    for (const contact of contacts) {
      const phone = contact.phone;
      const contactName = contact.name;

      // Send Twilio SMS if Twilio client is ready
      if (twilioClient && phone) {
        notificationPromises.push(
          twilioClient.messages
            .create({
              body: alertMessage,
              from: TWILIO_FROM,
              to: phone,
            })
            .then((msg) => logger.info(`Twilio SMS sent to ${contactName} (${phone}): ${msg.sid}`))
            .catch((err) => logger.error(`Failed to send SMS to ${contactName}:`, err))
        );
      } else {
        logger.warn(`Twilio SMS skipped for ${contactName} (Missing configuration or phone number)`);
      }

      // 3. Dispatch FCM Push Notification to contact if they are a SafeHer user
      if (contact.uid) {
        notificationPromises.push(
          db.collection('fcm_tokens').doc(contact.uid).get().then(async (tokenDoc) => {
            if (tokenDoc.exists) {
              const { token } = tokenDoc.data();
              if (token) {
                const message = {
                  token,
                  notification: {
                    title: `🚨 Emergency Alert: ${senderName}`,
                    body: `${senderName} is in danger! Tap to open live tracking.`,
                  },
                  data: {
                    alertId,
                    uid,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard fallback
                  },
                };
                try {
                  const response = await admin.messaging().send(message);
                  logger.info(`FCM notification successfully sent to contact ${contactName}:`, response);
                } catch (fcmErr) {
                  logger.error(`FCM send failed for contact ${contactName}:`, fcmErr);
                }
              }
            }
          })
        );
      }
    }

    await Promise.all(notificationPromises);
  } catch (error) {
    logger.error('Error executing onSOSCreated trigger:', error);
  }

  return null;
});

/**
 * Triggered when a new incident report is uploaded.
 * Dispatches FCM alert notifications to all system administrators.
 */
exports.onIncidentCreated = onDocumentCreated('incidents/{incidentId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;

  const incident = snapshot.data();
  logger.info(`🛡️ New Incident reported: ${event.params.incidentId}`);

  try {
    // 1. Query for all Admin users
    const adminQuery = await db.collection('users').where('isAdmin', '==', true).get();
    const adminUids = adminQuery.docs.map(doc => doc.id);

    if (adminUids.length === 0) {
      logger.info('No admin accounts found to notify.');
      return null;
    }

    const notificationPromises = adminUids.map(async (adminUid) => {
      const tokenDoc = await db.collection('fcm_tokens').doc(adminUid).get();
      if (tokenDoc.exists) {
        const { token } = tokenDoc.data();
        if (token) {
          const message = {
            token,
            notification: {
              title: `🛡️ SafeHer: New Incident Report`,
              body: `Type: ${incident.type || 'General'}. Check the Admin terminal.`,
            },
            data: {
              incidentId: event.params.incidentId,
            },
          };
          try {
            await admin.messaging().send(message);
            logger.info(`Notified admin ${adminUid} about incident.`);
          } catch (fcmErr) {
            logger.error(`Failed FCM to admin ${adminUid}:`, fcmErr);
          }
        }
      }
    });

    await Promise.all(notificationPromises);
  } catch (err) {
    logger.error('Error executing onIncidentCreated trigger:', err);
  }

  return null;
});
