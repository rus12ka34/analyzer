import natural from 'natural';
import clustering, { DBSCAN } from 'density-clustering';
import TSNE from 'tsne-js';
import fs from 'fs';
import { createCanvas } from 'canvas';
import { AutoModel } from '@xenova/transformers';
import { PCA } from 'ml-pca';
// import kmeans from 'ml-kmeans';

// Путь к вашей модели ONNX

import use from '@tensorflow-models/universal-sentence-encoder';
import tf from '@tensorflow/tfjs';
// import tf_node from '@tensorflow/tfjs-node';

const modelPath = 'path/to/your/model.onnx';
const apiKey = 'AIzaSyB2m6IUTzz94_tMFAuhOy-ZQUtknCfbLQM';  // Заменить на свой API ключ
const videoId = 'EOHFHLuLA0g';  // Заменить на ID видео

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

            if(allComments.length > 1401) nextPageToken = undefined

            console.log(`Загружено ${allComments.length} комментариев...`);
        }

        return allComments;

    } catch (error) {
        console.error('Ошибка при получении комментариев:', error);
    }
}

// Запуск функции при загрузке страницы




// Пример документов (текстов)
// const texts = await fetchComments();


// Функция для получения эмбеддингов текста
async function getTextEmbeddings(texts) {
  // const vectors = [];
  // tfidf.documents.forEach((document, index) => {
  //     const vector = tfidf.listTerms(index).map(term => term.tfidf);
  //     vectors.push(vector);
  // });
  // return vectors;

  // const session = await ort.InferenceSession.create(modelPath);

  // // Преобразуем комментарии в формат, который понимает модель (векторизуем тексты)
  // const inputTensor = new ort.Tensor('string', texts, [texts.length]);

  // // Выполняем инференс через модель
  // const results = await session.run({ input_ids: inputTensor });

  // // Извлекаем эмбеддинги из результата
  // return results[session.outputNames[0]].data;


  const model = await use.load();
  
  // Получаем эмбеддинги для всех текстов
  const embeddings = await model.embed(texts);
  
  // Конвертируем эмбеддинги в массив для использования в DBSCAN

  return await embeddings.array();
}

// Параметры для DBSCAN
const eps = 2;  // Максимальное расстояние для соседей
const minPoints = 3;  // Минимальное количество точек в кластере

async function clusterTexts() {
  // Получаем эмбеддинги для всех текстов
  // console.log('texts >>> ', texts);
  // let embeddings = await getTextEmbeddings(texts);

  // embeddings = embeddings.map((em, index) => {
  //   return { em, text: texts[index]};
  // })

  // console.log('embeddings >>> ', embeddings);

  // fs.writeFileSync('embeddings/output4.txt', JSON.stringify(embeddings));

  const embeddings = JSON.parse(fs.readFileSync('embeddings/output13.txt'));
  console.log('embeddings >>> ', embeddings);

  // const pca = new PCA(embeddings);
  // const reducedEmbeddings = pca.predict(embeddings, { nComponents: 1000 });

  // const vectors = embeddings.map((e) => e.em);
  // const average = Math.round(vectors.map(vec => vec.length).reduce((sum, num) => sum + num, 0) / vectors.map(vec => vec.length).length);
  // console.log('average >> ', average);



 let model = new TSNE({
    dim: 2
  });
  
  // inputData is a nested array which can be converted into an ndarray
  // alternatively, it can be an array of coordinates (second argument should be specified as 'sparse')
  model.init({
    data: embeddings.map((e) => e.em),
    perplexity: 5,  // Попробуйте уменьшить perplexity
    eta: 200     // Скорость обучения
  });
  
  // `error`,  `iter`: final error and iteration number
  // note: computation-heavy action happens here
  model.run();
  
  // rerun without re-calculating pairwise distances, etc.
  model.rerun();
  
  // `output` is unpacked ndarray (regular nested javascript array)
  let output = model.getOutput();
  
  // `outputScaled` is `output` scaled to a range of [-1, 1]
  let reducedData = model.getOutputScaled();

  // console.log('output >>> ', output);




  // Инициализируем DBSCAN
  const dbscan = new DBSCAN();
  

  // Запуск DBSCAN для кластеризации
  const clusters = dbscan.run(output, eps, minPoints);

  // console.log('clusters >>> ', clusters);

  // Выводим результаты кластеризации
  // console.log("Результаты кластеризации:");
   for (const cluster in clusters) {
    // console.log(`\nКластер ${cluster}:`);
    clusters[cluster].forEach(id => {
      // console.log(`- ${embeddings[id].text}`);
    });
  }

  // Выводим выбросы (если они есть)
  const noise = [];
  clusters.forEach((cluster, index) => {
    if (cluster === -1) { // -1 обозначает выброс
      noise.push(index);
    }
  });

  // if (noise.length > 0) {
  //   console.log("\nВыбросы:");
  //   noise.forEach(i => {
  //     console.log(`- ${embeddings[id].text}`);
  //   });
  // } else {
  //   console.log("\nВыбросов нет.");
  // }

  // console.log('outputScaled >>> ', outputScaled);

  // Создадим холст для отображения точек
  const width = 500;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  function drawPoints(data) {
      ctx.clearRect(0, 0, width, height);

      data.forEach(point => {
          // Преобразуем значения из диапазона [-1, 1] в диапазон [0, width] и [0, height]
          const x = (point[0] + 1) / 2 * width;  // Преобразуем значение x
          const y = (point[1] + 1) / 2 * height; // Преобразуем значение y

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2, false);
          ctx.fillStyle = 'blue';
          ctx.fill();
      });
  }

  // Нарисуем точки на холсте
  drawPoints(reducedData);

  // Сохраним изображение

  const out = fs.createWriteStream('embedding_visualization.png');
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  out.on('finish', () => {
      console.log('Изображение сохранено как embedding_visualization.png');
  });


}

// Запуск кластеризации
clusterTexts();