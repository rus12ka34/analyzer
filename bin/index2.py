from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
from collections import defaultdict
import numpy as np
from googleapiclient.discovery import build
import hdbscan

# === НАСТРОЙКИ ===
YOUTUBE_API_KEY = 'AIzaSyB2m6IUTzz94_tMFAuhOy-ZQUtknCfbLQM'  # ← Вставь свой YouTube API ключ
VIDEO_ID = '8Fv6fJXjxao'               # ← Замени на нужный ID видео
MAX_COMMENTS = 450                     # Количество комментариев для загрузки

# === Функция получения комментариев с YouTube ===
def get_youtube_comments(api_key, video_id, max_comments=100):
    youtube = build('youtube', 'v3', developerKey=api_key)
    comments = []
    next_page_token = None

    while len(comments) < max_comments:
        response = youtube.commentThreads().list(
            part='snippet',
            videoId=video_id,
            maxResults=min(100, max_comments - len(comments)),
            textFormat='plainText',
            pageToken=next_page_token
        ).execute()

        for item in response['items']:
            comment = item['snippet']['topLevelComment']['snippet']['textDisplay']
            comments.append(comment)

        next_page_token = response.get('nextPageToken')
        if not next_page_token:
            break

    return comments

# === Загрузка комментариев ===
comments = get_youtube_comments(YOUTUBE_API_KEY, VIDEO_ID, MAX_COMMENTS)

# print(comments.join('\n'));

if not comments:
    print("Комментарии не найдены.")
    exit()

# === Загрузка своей обученной модели ===
model = SentenceTransformer('E:/models/newModal')  # Укажи путь к модели

# === Генерация эмбеддингов ===
embeddings = model.encode(comments, show_progress_bar=True)

# === Кластеризация HDBSCAN ===
clusterer = hdbscan.HDBSCAN(min_cluster_size=5, metric='euclidean')
labels = clusterer.fit_predict(embeddings)

# === Группировка комментариев по кластерам ===
clusters = defaultdict(list)
for comment, label in zip(comments, labels):
    clusters[label].append(comment)

# === Вывод кластеров ===
print("\nРезультаты кластеризации:")
for label, cluster_comments in clusters.items():
    if label == -1:
        continue  # Пропускаем шум
    print(f"\nКластер {label} — {len(cluster_comments)} комментариев")
    for c in cluster_comments[:5]:
        print(f"  - {c}")

# === Количество выбросов ===
print(f"\nКоличество выбросов (шум): {len(clusters.get(-1, []))}")

# === Визуализация кластеров (через PCA) ===
reduced = PCA(n_components=2).fit_transform(embeddings)
colors = plt.cm.get_cmap('tab10', np.max(labels) + 2)

plt.figure(figsize=(10, 7))
for i, (x, y) in enumerate(reduced):
    label = labels[i]
    plt.scatter(x, y, color=colors(label if label >= 0 else -1), s=20)

plt.title("Визуализация кластеров комментариев (HDBSCAN)")
plt.xlabel("PCA 1")
plt.ylabel("PCA 2")
plt.grid(True)
plt.show()