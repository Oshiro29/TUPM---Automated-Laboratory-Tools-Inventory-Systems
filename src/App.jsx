import { useState } from 'react'
import KioskLandingPage from './components/KioskLandingPage'
import KioskSelectTransaction from './components/KioskSelectTransaction'
import KioskToolSelection from './components/KioskToolSelection'
import KioskCoinDepositVerification from './components/KioskCoinDepositVerification'
import KioskToolReleaseConfirmation from './components/KioskToolReleaseConfirmation'
import KioskReturnVerification from './components/KioskReturnVerification'
import KioskReturnConfirmation from './components/KioskReturnConfirmation'
import AdminLiveMonitoringDashboard from './components/AdminLiveMonitoringDashboard'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')

  const renderPage = () => {
    switch(currentPage) {
      case 'landing':
        return <KioskLandingPage onNavigate={setCurrentPage} />
      case 'selectTransaction':
        return <KioskSelectTransaction onNavigate={setCurrentPage} />
      case 'toolSelection':
        return <KioskToolSelection onNavigate={setCurrentPage} />
      case 'coinDeposit':
        return <KioskCoinDepositVerification onNavigate={setCurrentPage} />
      case 'toolRelease':
        return <KioskToolReleaseConfirmation onNavigate={setCurrentPage} />
      case 'returnVerification':
        return <KioskReturnVerification onNavigate={setCurrentPage} />
      case 'returnConfirmation':
        return <KioskReturnConfirmation onNavigate={setCurrentPage} />
      case 'admin':
        return <AdminLiveMonitoringDashboard onNavigate={setCurrentPage} />
      default:
        return <KioskLandingPage onNavigate={setCurrentPage} />
    }
  }

  return (
    <div>
      {renderPage()}
    </div>
  )
}

export default App
