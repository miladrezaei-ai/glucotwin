import React, { useState, useEffect, useRef } from 'react';
import './amplify-config'; 
import { Activity, MessageSquare, TrendingUp, AlertCircle, LogOut, Mic, Send, Camera, Upload, Pill, Plus, Trash2 } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { signIn, signOut, getCurrentUser, signUp, confirmSignUp } from 'aws-amplify/auth';

export default function GlucoseMonitoringApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('rememberedPassword') || '');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'));
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
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: '',      // 'once_daily' | 'twice_daily' | 'three_times_daily' | 'as_needed'
    timesOfDay: [],     // ['morning', 'evening', 'with_meals']
  });

  const FREQUENCY_LABELS = {
    once_daily: 'Once daily',
    twice_daily: 'Twice daily',
    three_times_daily: 'Three times daily',
    as_needed: 'As needed',
  };

  const TIMES_OF_DAY_OPTIONS = [
    { value: 'morning', label: 'Morning' },
    { value: 'evening', label: 'Evening' },
    { value: 'with_meals', label: 'With meals' },
  ];

  const toggleTimeOfDay = (value) => {
    setNewMed(prev => ({
      ...prev,
      timesOfDay: prev.timesOfDay.includes(value)
        ? prev.timesOfDay.filter(t => t !== value)
        : [...prev.timesOfDay, value],
    }));
  };
  const [foodEntry, setFoodEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    mealType: '',
    notes: '',
  });
  const [selectedFoodFile, setSelectedFoodFile] = useState(null); // preview before upload
  const [uploadedDataset, setUploadedDataset] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('2025-10-14');
  const [medicationMarkers, setMedicationMarkers] = useState([]);
  const [foodMarkers, setFoodMarkers] = useState([]);  
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
    { time: '00:00', glucose: 95, target: 1000 },
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

  const API_BASE_URL = 'https://rbc39m8fqb.execute-api.eu-central-1.amazonaws.com/prod';
  const SAVE_FOOD_URL = `${API_BASE_URL}/food`;
  const GET_FOOD_URL = `${API_BASE_URL}/food`;
  const SAVE_MEDICATION_URL = `${API_BASE_URL}/medicine`;
  const GET_MEDICATIONS_URL = `${API_BASE_URL}/medicine`;
  const SAVE_PROFILE_URL = `${API_BASE_URL}/profile`;
  const GET_PROFILE_URL = `${API_BASE_URL}/profile`;
  const FETCH_DATA_URL = `${API_BASE_URL}/glucose`;
  const CHAT_AI_URL = `${API_BASE_URL}/chat`;


  const currentGlucose = glucoseData[glucoseData.length - 1]?.glucose;
  const avgGlucose = Math.round(glucoseData.reduce((acc, val) => acc + val.glucose, 0) / glucoseData.length);
  const S3_BUCKET_URL = 'https://glucoai-food-images.s3.eu-central-1.amazonaws.com/';

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'dashboard') {
      fetchGlucoseData();
    }
  }, [isLoggedIn, activeTab, selectedDate]);  // ✅ Added selectedDate

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

  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  const checkAuthStatus = async () => {
    try {
      const user = await getCurrentUser();
      setUserName(user.username);
      setIsLoggedIn(true);
    } catch (err) {
      setIsLoggedIn(false);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchGlucoseData = async () => {
    try {
      const response = await fetch(FETCH_DATA_URL);
      const raw = await response.json();

      // Unwrap API Gateway proxy response (body may be a stringified JSON)
      const result = raw.body
        ? (typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body)
        : raw;
  
      if (!result.data?.length) return;
  
      // Normalize: support both `timestamp` and `time` field names
      const normalizedData = result.data.map(item => ({
        ...item,
        time: item.time ?? item.timestamp,
      }));

      // Filter by selected date (timezone-safe)
      const filteredData = normalizedData.filter(item => {
        const itemDate = new Date(item.time).toISOString().split('T')[0];
        return itemDate === selectedDate;
      });
  
      if (filteredData.length === 0) {
        setGlucoseData([]);
        setMedicationMarkers([]);
        setFoodMarkers([]);
        return;
      }
  
      const hourlyGroups = {};
      
      filteredData.forEach((item) => {
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
          
          const fullDate = new Date(group.fullDateTime);
          const dateStr = fullDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
          });
  
          return {
            time: hourKey,
            dateStr: dateStr,
            displayLabel: `${hourKey}\n${dateStr}`,
            fullDateTime: group.fullDateTime,
            glucose: avgGlucose,
            target: 100,
          };
        });
  
      // ✅ Process medications as separate markers
      const medicationMarkersTemp = [];
      
      const medResponse = await fetch(GET_MEDICATIONS_URL);
      const medResult = await medResponse.json();
  
      if (medResult.data?.length) {
        medResult.data.forEach((med) => {
          const medDateStr = med.date.split('T')[0];
          
          if (medDateStr === selectedDate) {
            const medDate = new Date(med.date);
            const medHour = medDate.getHours();
            const medMinutes = medDate.getMinutes();
            
            // Find closest glucose reading
            const beforePoint = chartData.find(d => {
              const dataHour = parseInt(d.time.split(':')[0]);
              return dataHour <= medHour;
            });
            const afterPoint = chartData.find(d => {
              const dataHour = parseInt(d.time.split(':')[0]);
              return dataHour > medHour;
            });
      
            let interpolatedGlucose = beforePoint?.glucose || 100;
            if (beforePoint && afterPoint) {
              const beforeHour = parseInt(beforePoint.time.split(':')[0]);
              const afterHour = parseInt(afterPoint.time.split(':')[0]);
              const hourDiff = afterHour - beforeHour;
              const ratio = (medHour - beforeHour + medMinutes / 60) / hourDiff;
              interpolatedGlucose = Math.round(
                beforePoint.glucose + (afterPoint.glucose - beforePoint.glucose) * ratio
              );
            }
      
            // ✅ Add to chartData (it will be rendered as part of the line)
            chartData.push({
              time: `${medHour.toString().padStart(2, '0')}:${medMinutes.toString().padStart(2, '0')}`,
              glucose: interpolatedGlucose,
              target: 100,
              hasMedication: true,
              medication: med.medicationName,
              dosage: med.dosage,
            });
      
            console.log(`✅ Added medication at: ${medHour}:${medMinutes}`);
          }
        });
      }
  
      // ✅ Process food as separate markers
      const foodMarkersTemp = [];
      
      try {
        const foodResponse = await fetch(GET_FOOD_URL);
        const foodResult = await foodResponse.json();
      
        if (foodResult.data?.length) {
          foodResult.data.forEach((food) => {
            const foodDateStr = food.date.split('T')[0];
            
            if (foodDateStr === selectedDate) {
              const foodDate = new Date(food.date);
              const foodHour = foodDate.getHours();
              const foodMinutes = foodDate.getMinutes();
              
              // Find closest glucose reading
              const beforePoint = chartData.find(d => {
                const dataHour = parseInt(d.time.split(':')[0]);
                return dataHour <= foodHour;
              });
              const afterPoint = chartData.find(d => {
                const dataHour = parseInt(d.time.split(':')[0]);
                return dataHour > foodHour;
              });
      
              let interpolatedGlucose = beforePoint?.glucose || 100;
              if (beforePoint && afterPoint) {
                const beforeHour = parseInt(beforePoint.time.split(':')[0]);
                const afterHour = parseInt(afterPoint.time.split(':')[0]);
                const hourDiff = afterHour - beforeHour;
                const ratio = (foodHour - beforeHour + foodMinutes / 60) / hourDiff;
                interpolatedGlucose = Math.round(
                  beforePoint.glucose + (afterPoint.glucose - beforePoint.glucose) * ratio
                );
              }
      
              // ✅ Add to chartData
              chartData.push({
                time: `${foodHour.toString().padStart(2, '0')}:${foodMinutes.toString().padStart(2, '0')}`,
                glucose: interpolatedGlucose,
                target: 100,
                hasFood: true,
                foodDescription: food.description,
                foodImage: food.imageUrl,
              });
      
              console.log(`✅ Added food at: ${foodHour}:${foodMinutes}`);
            }
          });
        }
      } catch (error) {
        console.error("🍔 Error fetching food entries:", error);
      }
  
      // ✅ Sort chart data by time only
      chartData.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + (timeA[1] || 0)) - (timeB[0] * 60 + (timeB[1] || 0));
      });
  
      console.log('🩸 Sample glucose data:', chartData[0]);
      console.log('💊 Medication markers:', medicationMarkersTemp);

      setGlucoseData(chartData);
      
      console.log("🩸 Total glucose points:", chartData.length);
      console.log("💊 Total medication markers:", medicationMarkersTemp.length);
      console.log("🍔 Total food markers:", foodMarkersTemp.length);
  
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
          id: item.medicationName,           // stable key — no timestamp
          name: item.medicationName,
          dosage: item.dosage,
          frequency: item.frequency,
          timesOfDay: item.timesOfDay || [],
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
      
      // ✅ Handle API Gateway response format
      let profileData;
      
      if (result.body) {
        // API Gateway returns: {statusCode: 200, body: '{"data": {...}}'}
        const bodyData = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
        profileData = bodyData.data;
      } else if (result.data) {
        // Direct format: {data: {...}}
        profileData = result.data;
      }
      
      if (profileData) {
        console.log('✅ Setting profile data:', profileData);
        setProfile({
          fullName: profileData.fullName || '',
          age: profileData.age || '',
          diabetesType: profileData.diabetesType || '',
          diagnosisYear: profileData.diagnosisYear || '',
          weight: profileData.weight || '',
          height: profileData.height || ''
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (email && password) {
      try {
        const user = await signIn({ username: email, password: password });
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        setUserName(email.split('@')[0]);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      // Force complete logout
      await signOut({ global: true });
  
      // Clear local storage + cookies just to be sure
      localStorage.clear();
      sessionStorage.clear();
  
      // Reset state
      setIsLoggedIn(false);
      setEmail('');
      setPassword('');
      setUserName('');
      setChatMessages([]);
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleFoodFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFoodFile(file);
  };

  const handleFoodPhoto = async () => {
    const file = selectedFoodFile;
    if (!file) return;

    if (!foodEntry.date || !foodEntry.time) {
      alert('⚠️ Please select date and time for the food entry');
      return;
    }
  
    try {
      const loadingId = Date.now();
      const tempUrl = URL.createObjectURL(file);
      
      const loadingPhoto = {
        id: loadingId,
        url: tempUrl,
        name: file.name,
        timestamp: 'Uploading...',
        description: '⏳ Uploading and analyzing with AI...'
      };
      setFoodPhotos([loadingPhoto, ...foodPhotos]);
  
      const userId = 'sdfdsf';
      const foodId = uuidv4();

      const [hours, minutes] = foodEntry.time.split(':');
      const isoDateWithMicroseconds = `${foodEntry.date}T${hours}:${minutes}:00.000000`;
      const date_obj = new Date(isoDateWithMicroseconds.split('.')[0]);
      const timestamp = Math.floor(date_obj.getTime());
      
      // ✅ Clean original filename
      let cleanFileName = file.name;
      const filenameParts = cleanFileName.split('_');
      if (filenameParts.length > 2) {
        // Keep only the actual filename part
        cleanFileName = filenameParts.slice(-1)[0];
      }

      // ✅ Build clean S3 filename
      const fileName = `${userId}_${foodId}_${cleanFileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const s3Url = `${S3_BUCKET_URL}${fileName}`;

      console.log('📤 Clean filename:', fileName);
      console.log('📤 Uploading to S3:', s3Url);
      
      console.log('📤 Uploading to S3:', s3Url);
      
      await fetch(s3Url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      }).then(response => {
        if (!response.ok) {
          throw new Error(`S3 upload failed: ${response.status}`);
        }
        console.log('✅ Image uploaded to S3');
      });
  
      // ✅ Save to DynamoDB with foodId
      const foodData = {
        userId: userId,
        foodId: foodId,
        timestamp: timestamp,
        imageUrl: s3Url,
        description: '🤖 AI analyzing food...',
        date: isoDateWithMicroseconds,
        mealType: foodEntry.mealType || 'unspecified',
        notes: foodEntry.notes || '',
      };
  
      console.log('💾 Saving to DynamoDB:', foodData);
  
      const response = await fetch(SAVE_FOOD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foodData)
      });
  
      const result = await response.json();
  
      if (response.ok) {
        console.log('✅ Saved to DynamoDB with foodId:', foodId);
        
        const displayDate = new Date(`${foodEntry.date}T${foodEntry.time}`);
        
        setFoodPhotos(prev => prev.map(p => 
          p.id === loadingId ? {
            id: foodId,
            url: s3Url,
            name: file.name,
            timestamp: displayDate.toLocaleString(),
            description: '🤖 AI analyzing food... (refresh in 10 seconds)',
            date: isoDateWithMicroseconds,
            mealType: foodEntry.mealType,
          } : p
        ));

        setFoodEntry(prev => ({ ...prev, notes: '', mealType: '' }));
        setSelectedFoodFile(null);
        alert('✅ Food photo uploaded! AI is analyzing...');
        
        // Auto-refresh
        setTimeout(() => {
          fetchFoodEntries();
          if (activeTab === 'dashboard') {
            fetchGlucoseData();
          }
        }, 10000);
        
      } else {
        throw new Error(result.error || 'Failed to save');
      }
  
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ Error uploading food photo: ' + error.message);
      setFoodPhotos(prev => prev.filter(p => p.description !== '⏳ Uploading and analyzing with AI...'));
    }
  };

  const deleteFoodPhoto = async (id, mealType) => {
    if (!window.confirm(`Remove this ${mealType || 'meal'} photo?`)) return;
    try {
      const userId = 'sdfdsf';
      const response = await fetch(
        `${GET_FOOD_URL}?foodId=${encodeURIComponent(id)}&userId=${userId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setFoodPhotos(prev => prev.filter(p => p.id !== id));
      } else {
        alert('❌ Failed to delete food entry');
      }
    } catch (error) {
      console.error('Error deleting food entry:', error);
      alert('❌ Error deleting food entry: ' + error.message);
    }
  };

  const addMedication = async () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency) {
      alert('⚠️ Please fill in medication name, dosage, and frequency');
      return;
    }

    try {
      const userId = 'sdfdsf';

      const response = await fetch(SAVE_MEDICATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          medicationName: newMed.name,
          dosage: newMed.dosage,
          frequency: newMed.frequency,
          timesOfDay: newMed.timesOfDay,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMedications(prev => {
          // upsert — replace if same name already in list
          const filtered = prev.filter(m => m.name !== newMed.name);
          return [...filtered, {
            id: newMed.name,
            name: newMed.name,
            dosage: newMed.dosage,
            frequency: newMed.frequency,
            timesOfDay: newMed.timesOfDay,
          }];
        });
        setNewMed({ name: '', dosage: '', frequency: '', timesOfDay: [] });
        alert('✅ Medication saved successfully!');
      } else {
        alert('❌ Failed to save medication: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('❌ Error saving medication: ' + error.message);
    }
  };

  const deleteMedication = async (medicationName) => {
    if (!window.confirm(`Remove ${medicationName} from your medications?`)) return;
    try {
      const userId = 'sdfdsf';
      const response = await fetch(
        `${SAVE_MEDICATION_URL}?medicationName=${encodeURIComponent(medicationName)}&userId=${userId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setMedications(prev => prev.filter(m => m.name !== medicationName));
      } else {
        alert('❌ Failed to delete medication');
      }
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('❌ Error deleting medication: ' + error.message);
    }
  };

  const handleDatasetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      const userId = 'sdfdsf';
      const timestamp = Date.now();
      const key = `${userId}_${timestamp}_${file.name}`;
      const s3Url = `https://glucoai-dataset.s3.eu-central-1.amazonaws.com/${key}`;
      
      const res = await fetch(s3Url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'text/csv' }
      });

      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);

      setUploadedDataset({
        fileName: file.name,
        uploadedAt: new Date().toLocaleString(),
        s3Url,
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
          history: chatHistory,
        }),
      });
  
      console.log('🟡 Response received');
      console.log('🟡 Status:', response.status);
      console.log('🟡 Status Text:', response.statusText);
  
      const raw = await response.json();
      
      // Unwrap API Gateway proxy response if body is a stringified JSON
      const data = raw.body
        ? (typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body)
        : raw;

      console.log('🟠 Data parsed:', data);
  
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
        console.log('🔑 Session ID set:', data.sessionId);
      }

      if (data.history) {
        setChatHistory(data.history);
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-cyan-100">Remember me</span>
              </label>

              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                Sign In
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-white text-xs">Health Insights</p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <Camera className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-white text-xs">Food Tracker</p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
              <Pill className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-white text-xs">Medicine Tracker</p>
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
                <p className="text-sm font-semibold text-gray-900">Hello, Ga Mei</p>
                {/* <p className="text-xs text-gray-500">{email}</p> */}
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
            <p className="text-sm font-medium text-gray-600">Minimum</p>
            <TrendingUp className="w-5 h-5 text-blue-500 transform rotate-180" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {glucoseData.length > 0 ? Math.min(...glucoseData.map(d => d.glucose).filter(g => g)) : '--'}
          </p>
          <p className="text-sm text-gray-500 mt-1">mg/dL</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Maximum</p>
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {glucoseData.length > 0 ? Math.max(...glucoseData.map(d => d.glucose).filter(g => g)) : '--'}
          </p>
          <p className="text-sm text-gray-500 mt-1">mg/dL</p>
        </div>
      </div>
      {/* ✅ ADD THIS DATE FILTER */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-bold text-gray-900">Select Date</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const yesterday = new Date(selectedDate);
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
            >
              ← Previous
            </button>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            
            <button
              onClick={() => {
                const tomorrow = new Date(selectedDate);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const maxDate = new Date().toISOString().split('T')[0];
                if (tomorrow.toISOString().split('T')[0] <= maxDate) {
                  setSelectedDate(tomorrow.toISOString().split('T')[0]);
                }
              }}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
            >
              Next →
            </button>
            
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Today
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          Viewing: <span className="font-semibold">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </p>
      </div>
      {/* ✅ END OF DATE FILTER */}


      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Glucose Levels
          </h3>
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
                <XAxis 
                  dataKey="time"
                  stroke="#6B7280" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                  interval={'preserveStartEnd'}
                  allowDuplicatedCategory={false}  // ✅ This removes duplicates
                />
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
                  data={glucoseData.filter(d => !d.hasMedication && !d.hasFood)}  // ✅ Exclude med/food from line
                  dot={(props) => {
                    const { cx, cy, payload, index } = props;
                    
                    // Find if there's medication/food at this exact time
                    const medAtTime = glucoseData.find(d => d.hasMedication && d.time === payload.time);
                    const foodAtTime = glucoseData.find(d => d.hasFood && d.time === payload.time);
                    
                    if (medAtTime) {
                      return (
                        <g
                          onClick={() => alert(`💊 ${medAtTime.medication}\nDosage: ${medAtTime.dosage}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle cx={cx} cy={cy} r={8} fill="#9333EA" stroke="#fff" strokeWidth={2} />
                          <text x={cx} y={cy + 3} textAnchor="middle" fill="#fff" fontSize={10}>
                            💊
                          </text>
                        </g>
                      );
                    }
                    
                    if (foodAtTime) {
                      return (
                        <g
                          onClick={() => {
                            const msg = `🍔 Food Logged\n\n${foodAtTime.foodDescription}\n\nClick OK to view image`;
                            if (window.confirm(msg) && foodAtTime.foodImage) {
                              window.open(foodAtTime.foodImage, '_blank');
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
              <p className="text-gray-500 font-semibold">No glucose data here yet</p>
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
            onClick={() => setInputMessage("Summarize glucose data")}
            className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors"
          >
            📊 Summarize glucose data
          </button>
          <button 
            onClick={() => setInputMessage("How did my medication affect my glucose levels?")}
            className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-colors"
          >
            💊 Medication Impact
          </button>
          <button 
            onClick={() => setInputMessage("How did the food I ate affect my glucose levels?")}
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
        <p className="text-gray-600 mb-6">Upload the photo of your meals for AI nutritional analysis</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
            <div className="flex gap-2 flex-wrap">
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                <button
                  key={type}
                  onClick={() => setFoodEntry({...foodEntry, mealType: type})}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    foodEntry.mealType === type
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={foodEntry.date}
                onChange={(e) => setFoodEntry({...foodEntry, date: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                value={foodEntry.time}
                onChange={(e) => setFoodEntry({...foodEntry, time: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={foodEntry.notes}
              onChange={(e) => setFoodEntry({...foodEntry, notes: e.target.value})}
              placeholder="e.g. large portion, ate quickly, restaurant meal"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <div
              onClick={() => foodInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all"
            >
              {selectedFoodFile ? (
                <img
                  src={URL.createObjectURL(selectedFoodFile)}
                  alt="preview"
                  className="w-full max-h-48 object-cover rounded-lg"
                />
              ) : (
                <>
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to select a photo</p>
                </>
              )}
            </div>
            {selectedFoodFile && (
              <p className="text-xs text-gray-500 mt-1 truncate">{selectedFoodFile.name}</p>
            )}
          </div>

          <button
            onClick={handleFoodPhoto}
            disabled={!selectedFoodFile}
            className={`w-full font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 ${
              selectedFoodFile
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Camera className="w-6 h-6" />
            {selectedFoodFile ? 'Upload & Analyze' : 'Select a photo first'}
          </button>
        </div>
        
        <input ref={foodInputRef} type="file" accept="image/*" onChange={handleFoodFileSelect} className="hidden" />
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
                    <div>
                      <p className="text-sm font-medium text-gray-800">{photo.mealType || 'Meal'}</p>
                      <p className="text-xs text-gray-500">{photo.timestamp}</p>
                    </div>
                    <button onClick={() => deleteFoodPhoto(photo.id, photo.mealType)} className="text-red-500 hover:text-red-700">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <select
              value={newMed.frequency}
              onChange={(e) => setNewMed({...newMed, frequency: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select frequency</option>
              <option value="once_daily">Once daily</option>
              <option value="twice_daily">Twice daily</option>
              <option value="three_times_daily">Three times daily</option>
              <option value="as_needed">As needed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time of day</label>
            <div className="flex gap-3 flex-wrap">
              {TIMES_OF_DAY_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMed.timesOfDay.includes(opt.value)}
                    onChange={() => toggleTimeOfDay(opt.value)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
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
                    <p className="text-sm text-gray-600">
                      {med.dosage} • {FREQUENCY_LABELS[med.frequency] || med.frequency}
                      {med.timesOfDay?.length > 0 && ` • ${med.timesOfDay.map(t => TIMES_OF_DAY_OPTIONS.find(o => o.value === t)?.label || t).join(', ')}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteMedication(med.name)} className="text-red-500 hover:text-red-700">
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">Upload successful!</p>
            <p className="text-green-700 text-sm mt-1">Your glucose data is being processed. Dashboard will update shortly.</p>
          </div>
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
