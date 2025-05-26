const apiKey = 'AIzaSyB2m6IUTzz94_tMFAuhOy-ZQUtknCfbLQM';  // Заменить на свой API ключ

// Функция для получения комментариев
export async function fetchComments({ videoId }) {
    const baseUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=100`;
    let allComments = []; // Массив для хранения всех комментариев
    let nextPageToken = ''; // Для хранения токена для пагинации

    try {
        // Повторяем запросы, пока есть странички для загрузки
        while (nextPageToken !== undefined) {
            let url = baseUrl;

            // Если nextPageToken существует, добавляем его в запрос
            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`;
            }

            // Делаем запрос к API
            const response = await fetch(url);
            const data = await response.json();

            // Получаем комментарии из ответа
            const comments = data.items.map((item) => {
                const a = item.snippet.topLevelComment.snippet.textOriginal.replace(/\s+/g, ' ').replace(/[^\w\sа-яА-ЯёЁ]/g, '').replace(/\d+/g, '').trim().toLowerCase().slice(0, 60);
                return a.length < 60 ? null : a;
            }).filter(Boolean);

            // console.log('comments >>> ', comments);

            allComments = allComments.concat(comments);
            nextPageToken = data.nextPageToken;


            console.log(`Загружено ${allComments.length} комментариев...`);
        }

        return allComments;

    } catch (error) {
        console.error('Ошибка при получении комментариев:', error);
    }
}

// Запуск функции при загрузке страницы