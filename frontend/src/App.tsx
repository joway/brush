import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Preview from './pages/Preview'
import Square from './pages/Square'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/square" element={<Square />} />
        <Route path="/:uuid" element={<Preview />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
