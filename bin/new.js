import { pipeline } from '@xenova/transformers';
import fs from 'fs';

const apiKey = 'AIzaSyB2m6IUTzz94_tMFAuhOy-ZQUtknCfbLQM';  // Заменить на свой API ключ
const videoId = '8Fv6fJXjxao';  // Заменить на ID видео

// Функция для получения комментариев
async function fetchComments() {
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
            const comments = data.items.map((item) => item.snippet.topLevelComment.snippet.textOriginal.replace(/\s+/g, ' ').replace(/[^\w\sа-яА-ЯёЁ]/g, '').trim().toLowerCase());
            allComments = allComments.concat(comments);
            nextPageToken = data.nextPageToken;

            // if(allComments.length > 901) nextPageToken = undefined

            console.log(`Загружено ${allComments.length} комментариев...`);
        }

        return allComments;

    } catch (error) {
        console.error('Ошибка при получении комментариев:', error);
    }
}

// Запуск функции при загрузке страницы




// Пример документов (текстов)
const texts = await fetchComments();
console.log('texts >>> ', texts);

async function getEmbedding(text) {
  // Загружаем пайплайн feature-extraction
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  // Получаем эмбеддинг
  const output = await extractor(text);

  return output.data; // Это массив эмбеддинга
}


let ems = [];
for (const t of texts) {
  const em = await getEmbedding(t);
  ems.push({ em: Array.from(em), text: t });
};


const length = 1000;
const maxLength = Math.max(...ems.map(vec => vec.em.length));
const minLength = Math.min(...ems.map(vec => vec.em.length));

const vectors = ems.map((e) => e.em);
const average = Math.round(vectors.map(vec => vec.length).reduce((sum, num) => sum + num, 0) / vectors.map(vec => vec.length).length / 2);


ems = ems.map((embed) => {
    // if (embed.em.length >= length) {
    //     return { em: embed.em.splice(0, length), text: embed.text };
    // }
    // return null;
    // const padding = Array(minLength - embed.em.length).fill(0);
    // return { em: embed.em.concat(padding), text: embed.text };
    return { em: embed.em.splice(0, minLength), text: embed.text };
}).filter(Boolean);

console.log('ems >>> ', ems);




fs.writeFileSync('embeddings/output13.txt', JSON.stringify(ems));

// console.log('ems >>> ', ems);
