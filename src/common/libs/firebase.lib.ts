import admin from 'firebase-admin'

import { envVariables } from '#/factory'

const privateKey = envVariables.GOOGLE_AUTH_PRIVATE_KEY.replace(/\\n/g, '\n')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: envVariables.GOOGLE_PROJECT_ID,
      clientEmail: envVariables.GOOGLE_AUTH_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    databaseURL: envVariables.FIREBASE_DATABASE_URL || 'https://monomax-chatbot-default-rtdb.firebaseio.com',
  })
}

export const db = admin.firestore()
export const rtdb = admin.database()
export const firebase = admin
