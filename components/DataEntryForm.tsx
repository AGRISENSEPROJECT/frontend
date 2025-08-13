const handleSubmit = async () => {
    if (!image) {
        Alert.alert('Please select an image');
        return;
    }

    const data = new FormData();
    data.append('image', {
        uri: image.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    });
    Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
    });

    try {
        const response = await fetch('https://agrisense-api.onrender.com/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            body: data,
        });
        const responseData = await response.json();
        console.log('Response:', responseData);
        Alert.alert('Success', JSON.stringify(responseData));
    } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', error.message);
    }
};
