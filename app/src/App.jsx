import React, { useState, useEffect, useRef } from 'react';
import { Activity, MessageSquare, TrendingUp, AlertCircle, LogOut, Mic, Send, Camera, Upload, Pill, Plus, Trash2 } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function GlucoseMonitoringApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [foodPhotos, setFoodPhotos] = useState([]);
  const [medications, setMedications] = useState([]);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', time: '' });
  const [uploadedDataset, setUploadedDataset] = useState(null);
  const chatEndRef = useRef(null);
  const foodInputRef = useRef(null);
  const datasetInputRef = useRef(null);

  const [glucoseData, setGlucoseData] = useState([
    { time: '00:00', glucose: 95, target: 100 },
    { time: '02:00', glucose: 88, target: 100 },
    { time: '04:00', glucose: 92, target: 100 },
    { time: '06:00', glucose: 105, target: 100 },
    { time: '08:00', glucose: 142, target: 100 },
    { time: '10:00', glucose: 118, target: 100 },
    { time: '12:00', glucose: 156, target: 100 },
    { time: '14:00', glucose: 132, target: 100 },
    { time: '16:00', glucose: 108, target: 100 },
    { time: '18:00', glucose: 145, target: 100 },
    { time: '20:00', glucose: 122, target: 100 },
    { time: '22:00', glucose: 98, target: 100 },
  ]);

  const currentGlucose = glucoseData[glucoseData.length - 1].glucose;
  const avgGlucose = Math.round(glucoseData.reduce((acc, val) => acc + val.glucose, 0) / glucoseData.length);
  const FETCH_DATA_URL = 'https://6cwiyk4o5l5ygmcuo7u64we4bq0srulh.lambda-url.eu-central-1.on.aws/';
  
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setUserName(email.split('@')[0]);
      setIsLoggedIn(true);
      setChatMessages([{
        type: 'bot',
        text: `Hello ${email.split('@')[0]}! I'm your AI glucose assistant. I can help you understand your readings, analyze your food photos, review your medications, and provide personalized advice.`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === 'dashboard') {
      fetchGlucoseData();
    }
  }, [isLoggedIn, activeTab]);

  const fetchGlucoseData = async () => {
    try {
      const userId = email || 'demo-user';
      const response = await fetch(`${FETCH_DATA_URL}?userId=${userId}`);
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        // Sample data for better visualization (take every Nth point)
        const sampleSize = 48;
        const step = Math.max(1, Math.floor(result.data.length / sampleSize));
        const sampledData = result.data.filter((_, idx) => idx % step === 0);
        
        // Format for chart
        const chartData = sampledData.map(item => {
          const date = new Date(item.time);
          return {
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            glucose: item.glucose,
            target: 100
          };
        });
        
        setGlucoseData(chartData);
      }
    } catch (error) {
      console.error('Error fetching glucose data:', error);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setUserName('');
    setChatMessages([]);
    setActiveTab('dashboard');
  };

  const handleFoodPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newPhoto = {
        id: Date.now(),
        url: event.target.result,
        name: file.name,
        timestamp: new Date().toLocaleString(),
        analysis: 'AI analyzing nutritional content...'
      };
      setFoodPhotos([...foodPhotos, newPhoto]);
      
      setTimeout(() => {
        setFoodPhotos(prev => prev.map(photo => 
          photo.id === newPhoto.id ? 
          { ...photo, analysis: 'Est. Carbs: 45g | Protein: 12g | Fat: 8g | Estimated glucose impact: +40-50 mg/dL' } : 
          photo
        ));
      }, 2000);
    };
    reader.readAsDataURL(file);
  };

  const deleteFoodPhoto = (id) => {
    setFoodPhotos(foodPhotos.filter(p => p.id !== id));
  };

  const addMedication = () => {
    if (newMed.name && newMed.dosage && newMed.time) {
      setMedications([...medications, { ...newMed, id: Date.now() }]);
      setNewMed({ name: '', dosage: '', time: '' });
    }
  };

  const deleteMedication = (id) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const handleDatasetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const userId = email || 'demo-user';
      const timestamp = Date.now();
      const key = `${userId}_${timestamp}_${file.name}`;
      
      const s3Url = `https://glucoai-datasets.s3.eu-central-1.amazonaws.com/${key}`;
      
      await fetch(s3Url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'text/csv'
        }
      });

      alert('✅ Upload successful! Processing data...');
      
      setTimeout(() => {
        setActiveTab('dashboard');
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed: ' + error.message);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMsg = {
      type: 'user',
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages([...chatMessages, userMsg]);

    setTimeout(() => {
      let botResponse = '';
      const msgLower = inputMessage.toLowerCase();

      if (msgLower.includes('glucose') || msgLower.includes('sugar') || msgLower.includes('level')) {
        botResponse = `Your current glucose level is ${currentGlucose} mg/dL. Your 24-hour average is ${avgGlucose} mg/dL. ${currentGlucose > 140 ? 'This is slightly elevated. Consider light exercise and staying hydrated.' : currentGlucose < 70 ? 'This is low. Please consume 15g of fast-acting carbs immediately.' : 'This is within normal range!'}`;
      } else if (msgLower.includes('food') || msgLower.includes('meal')) {
        botResponse = `You have ${foodPhotos.length} food photos logged. I can analyze your meals to help you make better choices. Would you like me to review your recent meals?`;
      } else if (msgLower.includes('medication') || msgLower.includes('medicine')) {
        botResponse = `You have ${medications.length} medications recorded. Remember to take them as prescribed. Would you like me to set up reminders?`;
      } else if (msgLower.includes('data') || msgLower.includes('export')) {
        botResponse = uploadedDataset ? `I can see your uploaded data with ${uploadedDataset.data.length} records. Would you like me to analyze patterns?` : 'You can upload your device data in the Data Upload tab for detailed analysis.';
      } else {
        botResponse = `I can help with glucose monitoring, food analysis, medication tracking, and data insights. Your current reading is ${currentGlucose} mg/dL. What would you like to know?`;
      }

      setChatMessages(prev => [...prev, {
        type: 'bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }, 1000);

    setInputMessage('');
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setInputMessage('What is my current glucose level?');
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl mb-4 shadow-2xl">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">GlucoAI</h1>
            <p className="text-cyan-200">AI-Powered Glucose Monitoring</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-cyan-100 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-100 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                Sign In
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-cyan-200 text-sm">Demo Mode: Use any email/password</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-white text-xs">Real-time</p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <Camera className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-white text-xs">Food Track</p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <Pill className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-white text-xs">Med Manager</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">GlucoAI</h1>
                <p className="text-xs text-gray-500">Powered by AWS</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right mr-2">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('food')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'food' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Camera className="w-4 h-4 inline mr-2" />
                Food Tracker
              </button>
              <button
                onClick={() => setActiveTab('medications')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'medications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Pill className="w-4 h-4 inline mr-2" />
                Medications
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'data' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Data Upload
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                AI Assistant
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Current Glucose</p>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{currentGlucose}</p>
                <p className="text-sm text-gray-500 mt-1">mg/dL</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">24h Average</p>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{avgGlucose}</p>
                <p className="text-sm text-gray-500 mt-1">mg/dL</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {currentGlucose > 140 ? 'High' : currentGlucose < 70 ? 'Low' : 'Normal'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentGlucose > 140 ? 'Monitor closely' : currentGlucose < 70 ? 'Action needed' : 'All good'}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Time in Range</p>
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">78%</p>
                <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Glucose Levels {uploadedDataset ? `- ${uploadedDataset.fileName}` : '- Sample Data'}</h3>
                {uploadedDataset && (
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    Live Data: {uploadedDataset.data.length} records
                  </span>
                )}
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={glucoseData}>
                    <defs>
                      <linearGradient id="colorGlucose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="time" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" domain={[60, 250]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="glucose" stroke="#3B82F6" strokeWidth={3} fill="url(#colorGlucose)" />
                    <Line type="monotone" dataKey="target" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'food' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Food Photo Tracker</h3>
              <p className="text-gray-600 mb-6">Take photos of your meals for AI nutritional analysis</p>
              
              <button
                onClick={() => foodInputRef.current?.click()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-6 h-6" />
                Capture Food Photo
              </button>
              
              <input ref={foodInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoodPhoto} className="hidden" />
            </div>

            {foodPhotos.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Your Meals ({foodPhotos.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {foodPhotos.map(photo => (
                    <div key={photo.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <img src={photo.url} alt={photo.name} className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm text-gray-500">{photo.timestamp}</p>
                          <button onClick={() => deleteFoodPhoto(photo.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">{photo.analysis}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add Medication</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medication Name</label>
                  <input
                    type="text"
                    value={newMed.name}
                    onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                    placeholder="e.g., Metformin"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                  <input
                    type="text"
                    value={newMed.dosage}
                    onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                    placeholder="e.g., 500mg"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={newMed.time}
                    onChange={(e) => setNewMed({...newMed, time: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <button
                  onClick={addMedication}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Medication
                </button>
              </div>
            </div>

            {medications.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Your Medications ({medications.length})</h4>
                <div className="space-y-3">
                  {medications.map(med => (
                    <div key={med.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Pill className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{med.name}</p>
                          <p className="text-sm text-gray-600">{med.dosage} at {med.time}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteMedication(med.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Glucose Device Data</h3>
              <p className="text-gray-600 mb-6">Upload CSV export from your glucose monitoring device</p>
              
              <button
                onClick={() => datasetInputRef.current?.click()}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-6 h-6" />
                Upload CSV File
              </button>
              
              <input ref={datasetInputRef} type="file" accept=".csv" onChange={handleDatasetUpload} className="hidden" />
            </div>

            {uploadedDataset && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-900">Dataset: {uploadedDataset.fileName}</h4>
                  <span className="text-sm text-gray-500">{uploadedDataset.uploadedAt}</span>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-semibold">Upload successful!</p>
                  <p className="text-green-700 text-sm mt-1">
                    {uploadedDataset.data.length} records with {uploadedDataset.headers.length} columns
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {uploadedDataset.headers.map(h => (
                          <th key={h} className="text-left py-2 px-3 font-semibold text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedDataset.data.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          {uploadedDataset.headers.map(h => (
                            <td key={h} className="py-2 px-3 text-gray-600">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {uploadedDataset.data.length > 10 && (
                  <p className="text-gray-500 text-sm mt-4">Showing 10 of {uploadedDataset.data.length} rows</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                AI Health Assistant
              </h3>
              <p className="text-cyan-100 text-sm mt-1">Ask me anything about your glucose health</p>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'} rounded-2xl p-4 shadow-sm`}>
                    <p className={`text-sm ${msg.type === 'user' ? 'text-white' : 'text-gray-800'}`}>
                      {msg.text}
                    </p>
                    <p className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about glucose, food, medications..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleVoiceInput}
                  className={`p-3 rounded-xl transition-all ${
                    isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={sendMessage}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {isRecording && (
                <p className="text-sm text-red-500 mt-2 animate-pulse">Recording voice input...</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}