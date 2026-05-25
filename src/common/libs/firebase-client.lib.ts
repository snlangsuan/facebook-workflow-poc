import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

import { envVariables } from '#/factory'

import type { Auth } from 'firebase/auth'

export function getClientAuth(customApiKey?: string): Auth {
  const apiKey = customApiKey || envVariables.FIREBASE_WEB_API_KEY
  if (!apiKey) {
    throw new Error('Firebase Web API Key is not configured')
  }

  const projectId = envVariables.GOOGLE_PROJECT_ID
  const appName = 'firebase-client-app'
  const existingApp = getApps().find((app) => app.name === appName)

  if (existingApp) {
    return getAuth(existingApp)
  }

  const app = initializeApp(
    {
      apiKey: apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId: projectId,
    },
    appName,
  )

  return getAuth(app)
}
