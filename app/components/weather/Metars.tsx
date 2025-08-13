import { View, Text } from 'react-native';

export default function Metars() {
  const weatherTypes = [
    { type: 'Sunny', color: '#0B4D26' },
    { type: 'Cloudy', color: '#0B4D26' },
    { type: 'Drizzle', color: '#0B4D26' },
    { type: 'Rainy', color: '#0B4D26' },
    { type: 'Heavy Rain', color: '#0B4D26' }
  ];

  const timeLabels = ['6AM', '7AM', '8AM', '9AM', '10AM'];

  const weatherData = [
    [{ type: 'Cloudy', width: 80 }],
    [{ type: 'Sunny', width: 30 }],
    [{ type: 'Drizzle', width: 15 }],
    [{ type: 'Rainy', width: 60 }],
    [{ type: 'Sunny', width: 100 }]
  ];

  return (
    <View className="bg-white rounded-[32px] mx-4 mt-8 p-6">
      <Text className="text-xl font-semibold text-[#0B4D26] mb-6">
        METARs
      </Text>

      <View>
        {weatherTypes.map((item, typeIndex) => (
          <View key={typeIndex} className="flex-row items-center mb-4">
            <Text className="text-[#0B4D26] text-[15px] w-[100px] capitalize">
              {item.type}
            </Text>
            <View className="flex-1 flex-row h-3">
              {weatherData.map((timeSlot, timeIndex) => (
                <View key={timeIndex} className="flex-1">
                  {timeSlot.map((weather, weatherIndex) => (
                    weather.type.toLowerCase() === item.type.toLowerCase() && (
                      <View
                        key={weatherIndex}
                        style={{
                          width: `${weather.width}%`,
                          height: 8,
                          backgroundColor: item.color,
                          borderRadius: 2,
                        }}
                      />
                    )
                  ))}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View className="flex-row mt-2 pl-[100px]">
          {timeLabels.map((time, index) => (
            <Text
              key={index}
              className="flex-1 text-[#0B4D26] text-[13px] text-center"
            >
              {time}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}