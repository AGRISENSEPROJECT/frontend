# AgriSense - Smart Farming Application

A comprehensive mobile application that helps farmers analyze soil conditions and get AI-powered crop recommendations using either camera analysis or sensor data input.

## 🌱 Features

### User Authentication & Farm Management
- **User Registration & Login**: Secure authentication system
- **Farm Creation**: Set up farm profiles with location, size, soil type, and climate information
- **Farm Dashboard**: Overview of farm status and quick access to soil analysis

### Soil Analysis Methods

#### 1. Camera-Based Analysis
- Take photos of soil using device camera
- AI-powered image analysis for soil characteristics
- Quick visual assessment of soil conditions
- Suitable for rapid soil type identification

#### 2. Sensor Data Input
- Comprehensive manual data entry form
- Input soil properties: pH, moisture, temperature, NPK values
- Advanced options: soil texture, bulk density, porosity, electrical conductivity
- Environmental factors: rainfall, humidity, wind speed, solar radiation

### Crop Recommendations
- **AI-Powered Analysis**: Get crop suggestions based on soil data
- **Multiple Options**: View top 3 crop recommendations with detailed information
- **Growth Scores**: Visual representation of crop suitability
- **Detailed Information**: Planting seasons, water needs, temperature ranges, harvest times
- **Alternative Crops**: Discover other suitable crop options
- **Farming Tips**: Best practices and recommendations

## 🚀 User Flow

1. **Account Creation**: Users sign up and create accounts
2. **Farm Setup**: New users create farm profiles with detailed information
3. **Soil Analysis**: Choose between camera or sensor data methods
4. **Data Collection**: Either capture soil images or input sensor readings
5. **AI Analysis**: System processes data and generates recommendations
6. **Crop Recommendations**: View detailed crop suggestions with growth scores
7. **Farm Management**: Access dashboard for ongoing farm monitoring

## 🛠️ Technical Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router for seamless navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Camera**: Expo Camera for soil image capture
- **Storage**: AsyncStorage for local data persistence
- **Icons**: Lucide React Native and Expo Vector Icons
- **Charts**: React Native Chart Kit for data visualization

## 📱 Screens & Components

### Core Screens
- `index.tsx` - Home screen with app introduction
- `signup.tsx` - User registration
- `signin.tsx` - User authentication
- `(main)/create-farm.tsx` - Farm profile creation
- `(main)/dashboard.tsx` - Main farm dashboard
- `SoilDetection.tsx` - Soil analysis introduction
- `MethodSelection.tsx` - Choose analysis method
- `(main)/camera.jsx` - Camera-based soil analysis
- `components/EnhancedDataEntryForm.tsx` - Sensor data input form
- `CropRecommendation.tsx` - AI-generated crop recommendations

### Key Features
- **Responsive Design**: Works on both mobile and web platforms
- **Cross-Platform**: Compatible with iOS, Android, and web browsers
- **Modern UI**: Clean, intuitive interface with consistent design language
- **Form Validation**: Comprehensive input validation and error handling
- **Navigation**: Intuitive navigation flow between screens

## 🎯 Use Cases

### For New Farmers
- Learn about soil analysis and crop selection
- Get started with basic farming knowledge
- Understand soil requirements for different crops

### For Experienced Farmers
- Optimize crop selection based on soil conditions
- Integrate existing sensor data for analysis
- Improve yield through data-driven decisions

### For Agricultural Consultants
- Provide clients with professional soil analysis
- Generate detailed crop recommendation reports
- Monitor multiple farms and soil conditions

## 🔮 Future Enhancements

- **Real-time Monitoring**: Live sensor data integration
- **Weather Integration**: Advanced weather forecasting and alerts
- **Market Analysis**: Crop price trends and market recommendations
- **Community Features**: Farmer-to-farmer knowledge sharing
- **Machine Learning**: Improved AI models for better predictions
- **Offline Support**: Work without internet connectivity
- **Multi-language**: Support for multiple languages and regions

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Run on Device/Simulator**
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS
   npm run web      # For web browser
   ```

## 📋 Prerequisites

- Node.js (v16 or higher)
- Expo CLI
- React Native development environment
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## 🤝 Contributing

This project is designed to help farmers make better decisions through technology. Contributions are welcome to improve:

- Soil analysis algorithms
- Crop recommendation models
- User interface and experience
- Performance and reliability
- Documentation and testing

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**AgriSense** - Empowering farmers with intelligent soil analysis and crop recommendations for sustainable agriculture. 🌾
