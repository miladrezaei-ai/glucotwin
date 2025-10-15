import React, { useState, useEffect, useRef } from 'react';
import { Activity, MessageSquare, TrendingUp, AlertCircle, LogOut, Mic, Send, Camera, Upload, Pill, Plus, Trash2 } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from 'recharts';
import ReactMarkdown from 'react-markdown';

export default function GlucoseMonitoringApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatMessages, setChatMessages] = useState([
    {
      type: 'bot',
      text: "Hi! I'm your AI assistant. Ask me anything about your glucose trends, patterns, or get personalized insights.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [foodPhotos, setFoodPhotos] = useState([]);
  const [medications, setMedications] = useState([]);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', time: '' });
  const [uploadedDataset, setUploadedDataset] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    age: '',
    diabetesType: '',
    diagnosisYear: '',
    weight: '',
    height: ''
  });
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

  const currentGlucose = glucoseData[glucoseData.length - 1]?.glucose;
  const avgGlucose = Math.round(glucoseData.reduce((acc, val) => acc + val.glucose, 0) / glucoseData.length);
  const FETCH_DATA_URL = 'https://6cwiyk4o5l5ygmcuo7u64we4bq0srulh.lambda-url.eu-central-1.on.aws/';
  const SAVE_MEDICATION_URL = 'https://7xnwpq2rkbpvfmluph4myx6kry0hspem.lambda-url.eu-central-1.on.aws/';
  const GET_MEDICATIONS_URL = 'https://zpzxhtk5sio5zn5yeri4xnewn40bpjks.lambda-url.eu-central-1.on.aws/';
  const SAVE_PROFILE_URL = 'https://jg45umq5m5df2iq3wjojwqd6hq0cello.lambda-url.eu-central-1.on.aws/';
  const GET_PROFILE_URL = 'https://aoeav22ztkmxeyh5pnnqhlvc3u0zcrml.lambda-url.eu-central-1.on.aws/';
  const SAVE_FOOD_URL = 'https://vhtroxuvmxt6hlojy7mqjglgsi0ntssg.lambda-url.eu-central-1.on.aws/';
  const GET_FOOD_URL = 'https://cwbqb32m7xrbelvhduhe6afsn40juoaw.lambda-url.eu-central-1.on.aws/';
  const S3_BUCKET_URL = 'https://glucoai-food-images.s3.eu-central-1.amazonaws.com/';
  const CHAT_AI_URL = 'https://22lnzphycfzw5lnj6i5kf7og6q0ahqju.lambda-url.eu-central-1.on.aws/';

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'dashboard') {
      fetchGlucoseData();
    }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchMedications();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchProfile();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchFoodEntries();
    }
  }, [isLoggedIn]);

  const fetchGlucoseData = async () => {
    try {
      const response = await fetch(FETCH_DATA_URL);
      const result = await response.json();
  
      if (!result.data?.length) return;
  
      const hourlyGroups = {};
      
      result.data.forEach((item) => {
        const date = new Date(item.time);
        const hour = date.getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;
        
        if (!hourlyGroups[hourKey]) {
          hourlyGroups[hourKey] = {
            glucoseValues: [],
            timestamps: [],
            fullDateTime: item.time
          };
        }
        
        hourlyGroups[hourKey].glucoseValues.push(item.glucose);
        hourlyGroups[hourKey].timestamps.push(item.time);
      });
  
      const chartData = Object.keys(hourlyGroups)
        .sort((a, b) => {
          const hourA = parseInt(a.split(':')[0]);
          const hourB = parseInt(b.split(':')[0]);
          return hourA - hourB;
        })
        .map(hourKey => {
          const group = hourlyGroups[hourKey];
          const avgGlucose = Math.round(
            group.glucoseValues.reduce((sum, val) => sum + val, 0) / group.glucoseValues.length
          );
          
          return {
            time: hourKey,
            fullDateTime: group.fullDateTime,
            glucose: avgGlucose,
            target: 100,
          };
        });
  
      const medResponse = await fetch(GET_MEDICATIONS_URL);
      const medResult = await medResponse.json();
  
      if (medResult.data?.length) {
        medResult.data.forEach((med) => {
          const medDate = new Date(med.date);
          const medTime = medDate.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
  
          const medHour = medDate.getHours();
          const medMinutes = medDate.getMinutes();
  
          const beforePoint = chartData.find(d => parseInt(d.time) <= medHour);
          const afterPoint = chartData.find(d => parseInt(d.time) > medHour);
  
          let interpolatedGlucose = beforePoint?.glucose || 100;
          if (beforePoint && afterPoint) {
            const ratio = medMinutes / 60;
            interpolatedGlucose = Math.round(
              beforePoint.glucose + (afterPoint.glucose - beforePoint.glucose) * ratio
            );
          }
  
          chartData.push({
            time: medTime,
            glucose: interpolatedGlucose,
            target: 100,
            hasMedication: true,
            medication: med.medicationName,
            dosage: med.dosage,
            isMedicationPoint: true
          });
  
          console.log(`✅ Added medication at exact time: ${medTime}`);
        });
      }
  
      try {
        const foodResponse = await fetch(GET_FOOD_URL);
        const foodResult = await foodResponse.json();
  
        if (foodResult.data?.length) {
          foodResult.data.forEach((food) => {
            const foodDate = new Date(food.date);
            const foodTime = foodDate.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
  
            const foodHour = foodDate.getHours();
            const foodMinutes = foodDate.getMinutes();
  
            const beforePoint = chartData.find(d => parseInt(d.time) <= foodHour);
            const afterPoint = chartData.find(d => parseInt(d.time) > foodHour);
  
            let interpolatedGlucose = beforePoint?.glucose || 100;
            if (beforePoint && afterPoint) {
              const ratio = foodMinutes / 60;
              interpolatedGlucose = Math.round(
                beforePoint.glucose + (afterPoint.glucose - beforePoint.glucose) * ratio
              );
            }
  
            chartData.push({
              time: foodTime,
              glucose: interpolatedGlucose,
              target: 100,
              hasFood: true,
              foodDescription: food.description,
              foodImage: food.imageUrl,
              isFoodPoint: true
            });
  
            console.log(`✅ Added food at exact time: ${foodTime}`);
          });
        }
      } catch (error) {
        console.error("🍔 Error fetching food entries:", error);
      }
  
      chartData.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + (timeA[1] || 0)) - (timeB[0] * 60 + (timeB[1] || 0));
      });
  
      setGlucoseData(chartData);
      console.log("🩸 Total data points:", chartData.length);
  
    } catch (error) {
      console.error("Error fetching glucose data:", error);
    }
  };

  const fetchMedications = async () => {
    try {
      const response = await fetch(GET_MEDICATIONS_URL);
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        const meds = result.data.map(item => ({
          id: item.timestamp,
          name: item.medicationName,
          dosage: item.dosage,
          time: item.timeOfDay
        }));
        setMedications(meds);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const fetchProfile = async () => {
    console.log('🔍 Fetching profile from:', GET_PROFILE_URL);
    try {
      const response = await fetch(GET_PROFILE_URL);
      const result = await response.json();
      
      console.log('📥 Fetched profile result:', result);
      
      if (result.data) {
        console.log('✅ Setting profile data:', result.data);
        setProfile({
          fullName: result.data.fullName || '',
          age: result.data.age || '',
          diabetesType: result.data.diabetesType || '',
          diagnosisYear: result.data.diagnosisYear || '',
          weight: result.data.weight || '',
          height: result.data.height || ''
        });
      } else {
        console.log('⚠️ No profile data found');
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
    }
  };

  const fetchFoodEntries = async () => {
    try {
      const response = await fetch(GET_FOOD_URL);
      const result = await response.json();
      
      console.log('🍔 Fetched food entries:', result);
      
      if (result.data && result.data.length > 0) {
        const photos = result.data.map(item => ({
          id: item.timestamp,
          url: item.imageUrl,
          name: 'Food photo',
          timestamp: new Date(item.timestamp).toLocaleString(),
          description: item.description,
          date: item.date
        }));
        setFoodPhotos(photos);
      }
    } catch (error) {
      console.error('❌ Error fetching food entries:', error);
    }
  };
  
  const saveProfile = async () => {
    try {
      const userId = 'sdfdsf';
      
      const response = await fetch(SAVE_PROFILE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          ...profile
        })
      });
  
      const result = await response.json();
      
      if (response.ok) {
        const profileMessage = `Please remember my health profile: I am ${profile.fullName}, ${profile.age} years old, with ${profile.diabetesType} diabetes, diagnosed in ${profile.diagnosisYear}. My weight is ${profile.weight}kg and my height is ${profile.height}cm.`;
        
        try {
          await fetch(CHAT_AI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: profileMessage,
              sessionId: sessionId,
              userId: userId
            })
          });
          
          alert('✅ Profile saved and stored in AI memory!');
        } catch (memoryError) {
          console.error('Memory error:', memoryError);
          alert('✅ Profile saved (AI memory update failed)');
        }
      } else {
        alert('❌ Failed to save profile: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error saving profile: ' + error.message);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setUserName(email.split('@')[0]);
      setIsLoggedIn(true);
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

  const handleFoodPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const loadingId = Date.now();
      const tempUrl = URL.createObjectURL(file);
      
      const loadingPhoto = {
        id: loadingId,
        url: tempUrl,
        name: file.name,
        timestamp: 'Uploading...',
        description: '⏳ Uploading to cloud...'
      };
      setFoodPhotos([loadingPhoto, ...foodPhotos]);
  
      const userId = 'sdfdsf';
      const now = new Date();
      const timestamp = now.getTime();  // Keep for ID purposes
      const fileName = `${userId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const s3Url = `${S3_BUCKET_URL}${fileName}`;
      
      console.log('📤 Uploading to S3:', s3Url);
      
      await fetch(s3Url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
  
      console.log('✅ Image uploaded to S3');
  
      // ✅ CHANGED: Use ISO date string
      const foodData = {
        userId: userId,
        imageUrl: s3Url,
        description: 'Food item logged - AI analysis coming soon',
        date: now.toISOString()  // ✅ ISO format: "2025-10-14T18:47:23.456Z"
      };
  
      console.log('💾 Saving to DynamoDB:', foodData);
  
      const response = await fetch(SAVE_FOOD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foodData)
      });
  
      const result = await response.json();
  
      if (response.ok) {
        console.log('✅ Saved to DynamoDB');
        
        setFoodPhotos(prev => prev.map(p => 
          p.id === loadingId ? {
            id: timestamp,
            url: s3Url,
            name: file.name,
            timestamp: now.toLocaleString(),
            description: 'Food item logged successfully',
            date: now.toISOString()
          } : p
        ));
        
        alert('✅ Food photo saved successfully!');
        
        if (activeTab === 'dashboard') {
          fetchGlucoseData();
        }
      } else {
        throw new Error(result.error || 'Failed to save');
      }
  
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ Error uploading food photo: ' + error.message);
      setFoodPhotos(prev => prev.filter(p => p.description !== '⏳ Uploading to cloud...'));
    }
  };

  const deleteFoodPhoto = (id) => {
    setFoodPhotos(foodPhotos.filter(p => p.id !== id));
  };

  const addMedication = async () => {
    if (newMed.name && newMed.dosage && newMed.time) {
      try {
        const userId = 'sdfdsf';
        
        // ✅ CHANGED: Create proper date from time input
        const now = new Date();
        const [hours, minutes] = newMed.time.split(':');
        now.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const response = await fetch(SAVE_MEDICATION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            medicationName: newMed.name,
            dosage: newMed.dosage,
            timeOfDay: newMed.time,
            date: now.toISOString()  // ✅ ISO format
          })
        });
  
        const result = await response.json();
        
        if (response.ok) {
          setMedications([...medications, { 
            ...newMed, 
            id: Date.now()
          }]);
          setNewMed({ name: '', dosage: '', time: '' });
          alert('✅ Medication saved successfully!');
        } else {
          alert('❌ Failed to save medication: ' + result.error);
        }
      } catch (error) {
        console.error('Error saving medication:', error);
        alert('❌ Error saving medication: ' + error.message);
      }
    }
  };

  const deleteMedication = (id) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const handleDatasetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const userId = 'sdfdsf';
      const timestamp = Date.now();
      const key = `${userId}_${timestamp}_${file.name}`;
      
      const s3Url = `https://glucoai-datasets.s3.eu-central-1.amazonaws.com/${key}`;
      
      await fetch(s3Url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'text/csv' }
      });
  
      alert('✅ Upload successful! Processing data...');
      
      setTimeout(() => {
        fetchGlucoseData();
        setActiveTab('dashboard');
      }, 3000);
  
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed: ' + error.message);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
  
    console.log('🔵 sendMessage called');
    console.log('🔵 Input message:', inputMessage);
  
    const userMsg = {
      type: 'user',
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString(),
    };
  
    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsAiLoading(true);
  
    try {
      const userId = 'sdfdsf';
      
      console.log('🟢 About to call Lambda');
      console.log('🟢 Lambda URL:', CHAT_AI_URL);
      console.log('🟢 User ID:', userId);
      console.log('🟢 Message:', inputMessage);
      
      const response = await fetch(CHAT_AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId: sessionId || undefined,
          userId: userId,
        }),
      });
  
      console.log('🟡 Response received');
      console.log('🟡 Status:', response.status);
      console.log('🟡 Status Text:', response.statusText);
  
      const data = await response.json();
      
      console.log('🟠 Data parsed:', data);
  
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        console.log('🔑 Session ID set:', data.sessionId);
      }
  
      const botMsg = {
        type: 'bot',
        text: data.reply || 'Sorry, I encountered an error.',
        timestamp: new Date().toLocaleTimeString(),
      };
  
      console.log('🟣 Bot message:', botMsg);
  
      setChatMessages((prev) => [...prev, botMsg]);
  
    } catch (error) {
      console.error('🔴 ERROR in sendMessage:', error);
      console.error('🔴 Error details:', error.message);
      console.error('🔴 Error stack:', error.stack);
  
      const errorMsg = {
        type: 'bot',
        text: 'Sorry, I\'m having trouble connecting.',
        timestamp: new Date().toLocaleTimeString(),
      };
  
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
      console.log('⚫ sendMessage completed');
    }
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
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Profile
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
            <p className="text-sm font-medium text-gray-600">24h Average</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{avgGlucose || '--'}</p>
          <p className="text-sm text-gray-500 mt-1">mg/dL</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Status</p>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {currentGlucose ? (currentGlucose > 140 ? 'High' : currentGlucose < 70 ? 'Low' : 'Normal') : 'N/A'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {currentGlucose ? (currentGlucose > 140 ? 'Monitor closely' : currentGlucose < 70 ? 'Action needed' : 'All good') : 'Upload data'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Medications</p>
            <Pill className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{medications.length}</p>
          <p className="text-sm text-gray-500 mt-1">Active</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Glucose Levels {glucoseData.length > 12 ? '- Live Data' : '- Sample Data'}
          </h3>
          {glucoseData.length > 12 && (
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
              {glucoseData.length} data points
            </span>
          )}
        </div>
        
        {glucoseData.length > 0 ? (
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
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-sm font-semibold">{data.time}</p>
                          {data.glucose && <p className="text-sm text-blue-600">Glucose: {data.glucose} mg/dL</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="glucose" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  fill="url(#colorGlucose)"
                  connectNulls={true}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    
                    if (payload.hasMedication) {
                      return (
                        <g
                          onClick={() => alert(`💊 ${payload.medication}\nDosage: ${payload.dosage}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle cx={cx} cy={cy} r={8} fill="#9333EA" stroke="#fff" strokeWidth={2} />
                          <text x={cx} y={cy + 3} textAnchor="middle" fill="#fff" fontSize={10}>
                            💊
                          </text>
                        </g>
                      );
                    }
                    
                    if (payload.hasFood) {
                      return (
                        <g
                          onClick={() => {
                            const msg = `🍔 Food Logged\n\n${payload.foodDescription}\n\nClick OK to view image`;
                            if (window.confirm(msg) && payload.foodImage) {
                              window.open(payload.foodImage, '_blank');
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle cx={cx} cy={cy} r={8} fill="#10B981" stroke="#fff" strokeWidth={2} />
                          <text x={cx} y={cy + 3} textAnchor="middle" fill="#fff" fontSize={10}>
                            🍔
                          </text>
                        </g>
                      );
                    }
                    
                    return null;
                  }}
                />
                <Scatter
                  data={glucoseData.filter(d => d.hasMedication)}
                  fill="#9333EA"
                  shape="circle"
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-xl">
            <div className="text-center">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold">No glucose data yet</p>
              <p className="text-gray-400 text-sm mt-2">Upload a CSV file to see your data</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Chat Assistant */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Ask AI About Your Data</h3>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4 h-96 overflow-y-auto mb-4 space-y-3">
          {chatMessages.length === 0 ? (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-[80%] shadow-sm">
                <p className="text-base text-gray-800">
                  Hi! I'm your AI assistant. Ask me anything about your glucose trends, patterns, or get personalized insights.
                </p>
                <p className="text-xs text-gray-400 mt-2">Just now</p>
              </div>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'} rounded-2xl p-4 shadow-sm`}>
                  {msg.type === 'user' ? (
                    <p className="text-white text-sm">{msg.text}</p>
                  ) : (
                    <div className="text-gray-800 text-base leading-relaxed">
                      <ReactMarkdown 
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-3 text-gray-900" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-2 text-gray-900" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-3 mb-2 text-gray-900" {...props} />,
                          h4: ({node, ...props}) => <h4 className="text-sm font-semibold mt-2 mb-1 text-gray-900" {...props} />,
                          p: ({node, ...props}) => <p className="mb-3 text-gray-800 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="text-gray-800" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                          code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-2 text-gray-700" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                  <p className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your glucose patterns, trends, medications..."
            className="flex-1 px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <button
            onClick={sendMessage}
            disabled={isAiLoading}
            className={`px-6 py-4 rounded-xl flex items-center gap-2 font-semibold transition-all ${
              isAiLoading
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
            }`}
          >
            {isAiLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send
              </>
            )}
          </button>
        </div>
        
        <div className="mt-3 flex gap-2 flex-wrap">
          <button 
            onClick={() => setInputMessage("Explain my trends")}
            className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors"
          >
            💡 Explain my trends
          </button>
          <button 
            onClick={() => setInputMessage("When did I take medication?")}
            className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors"
          >
            💊 Medication times
          </button>
          <button 
            onClick={() => setInputMessage("Am I in target range?")}
            className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors"
          >
            🎯 Target range check
          </button>
          <button 
            onClick={() => setInputMessage("How did food affect my glucose?")}
            className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors"
          >
            🍔 Food impact
          </button>
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
                  <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">{photo.description}</p>
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

  {activeTab === 'profile' && (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Your Health Profile</h3>
        <p className="text-gray-600 mb-6">Keep your health information up to date</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({...profile, fullName: e.target.value})}
              placeholder="John Doe"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            <input
              type="number"
              value={profile.age}
              onChange={(e) => setProfile({...profile, age: e.target.value})}
              placeholder="35"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Diabetes Type</label>
            <select
              value={profile.diabetesType}
              onChange={(e) => setProfile({...profile, diabetesType: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type</option>
              <option value="Type 1">Type 1</option>
              <option value="Type 2">Type 2</option>
              <option value="Gestational">Gestational</option>
              <option value="Prediabetes">Prediabetes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year of Diagnosis</label>
            <input
              type="number"
              value={profile.diagnosisYear}
              onChange={(e) => setProfile({...profile, diagnosisYear: e.target.value})}
              placeholder="2020"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
            <input
              type="number"
              value={profile.weight}
              onChange={(e) => setProfile({...profile, weight: e.target.value})}
              placeholder="70"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
            <input
              type="number"
              value={profile.height}
              onChange={(e) => setProfile({...profile, height: e.target.value})}
              placeholder="175"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <button
          onClick={saveProfile}
          className="w-full mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Activity className="w-5 h-5" />
          Save Profile
        </button>
      </div>
    </div>
  )}
</main>
</div>
);
}        