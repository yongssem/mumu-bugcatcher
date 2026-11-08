import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import StorageNotice from './ui/StorageNotice.jsx'
import './index.css'

// StrictMode 미사용 — dev 이중 마운트 시 WebGL 엔진이 2번 생성되는 것 방지
ReactDOM.createRoot(document.getElementById('root')).render(<><App /><StorageNotice /></>)
