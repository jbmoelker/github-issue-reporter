import { useState } from 'react'
import './style.css'
import { AppProvider, useApp } from './contexts/app'
import { Header } from './components/Header'
import { LoginScreen } from './components/LoginScreen'
import { WaitingScreen } from './components/WaitingScreen'
import { ReportScreen } from './components/ReportScreen'
import { SuccessScreen } from './components/SuccessScreen'
import { useAuth } from './hooks/useAuth'
import type { CreatedIssue } from '@github-issue-reporter/shared'

function PopupContent() {
  const { t } = useApp()
  const { status, token, user, error, startLogin, cancelLogin, logout } = useAuth()
  const [createdIssue, setCreatedIssue] = useState<CreatedIssue | null>(null)

  return (
    <div className="w-[400px] min-h-[500px] bg-white dark:bg-gray-900 flex flex-col">
      <Header user={user} onLogout={logout} />

      {status === 'loading' && (
        <div className="flex items-center justify-center flex-1">
          <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
        </div>
      )}

      {status === 'idle' && <LoginScreen onLogin={startLogin} />}

      {status === 'waiting' && <WaitingScreen onCancel={cancelLogin} />}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center flex-1 p-8 gap-3 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error ?? t.errors.somethingWentWrong}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm underline underline-offset-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {t.errors.tryAgain}
          </button>
        </div>
      )}

      {status === 'authenticated' && token && !createdIssue && (
        <ReportScreen token={token} onIssueCreated={setCreatedIssue} />
      )}

      {status === 'authenticated' && createdIssue && (
        <SuccessScreen issue={createdIssue} onReset={() => setCreatedIssue(null)} />
      )}
    </div>
  )
}

export default function Popup() {
  return (
    <AppProvider>
      <PopupContent />
    </AppProvider>
  )
}
