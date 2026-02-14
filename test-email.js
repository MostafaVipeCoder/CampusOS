
// Using native fetch


async function testEmail() {
    const url = 'https://vqvcjzgqagtkcynnvpba.supabase.co/functions/v1/send-welcome-email';
    const apiKey = 'sb_publishable_m5mvcdKL5wMJLKssRZbuaQ_1tUjL3Kh';

    const payload = {
        record: {
            id: "68bd85d7-c7eb-4805-a8ad-6b2f708559cc",
            email: "abdullah.shaban615@gmail.com",
            full_name: "عبد الله شعبان",
            code: "TEST-CODE"
        }
    };

    try {
        console.log('Sending request to:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        console.log('Status Code:', response.status);
        const data = await response.json();
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testEmail();
