from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
from sklearn.preprocessing import normalize
from sklearn.metrics import silhouette_score
from sklearn.cluster import DBSCAN
from googleapiclient.discovery import build
from collections import defaultdict
import numpy as np
import umap
import matplotlib.pyplot as plt
from tqdm import tqdm

# === НАСТРОЙКИ ===
YOUTUBE_API_KEY = 'AIzaSyB2m6IUTzz94_tMFAuhOy-ZQUtknCfbLQM'  # ← Замени на свой ключ
VIDEO_ID = '8Fv6fJXjxao'               # ← Замени на нужный ID
MAX_COMMENTS = 450
PCA_DIM = 50
EPS_GRID = np.linspace(0.2, 3.0, 30)
MIN_SAMPLES = 17  # фиксированное значение min_samples

# === Получение комментариев ===
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
if not comments:
    print("Комментарии не найдены.")
    exit()

# === Эмбеддинги + нормализация + PCA ===
print("Генерация эмбеддингов и понижение размерности...")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
embeddings = model.encode(comments, show_progress_bar=True)
normalized_embeddings = normalize(embeddings)

pca = PCA(n_components=PCA_DIM)
reduced_embeddings = pca.fit_transform(normalized_embeddings)

# === Подбор eps с фиксированным min_samples ===
print(f"Поиск eps с min_samples={MIN_SAMPLES}, silhouette_score максимально близким к 0.5 (но не выше)...")
best_score = -999
best_eps = None
best_labels = None
target_score = 0.5

for eps in tqdm(EPS_GRID, desc="Перебор eps"):
    db = DBSCAN(eps=eps, min_samples=MIN_SAMPLES, metric='euclidean')
    labels = db.fit_predict(reduced_embeddings)
    mask = labels != -1
    n_clusters = len(set(labels[mask]))

    if n_clusters >= 2 and np.any(mask):
        try:
            score = silhouette_score(reduced_embeddings[mask], labels[mask])
            if score <= target_score and (best_score == -999 or abs(score - target_score) < abs(best_score - target_score)):
                best_score = score
                best_eps = eps
                best_labels = labels
        except:
            continue

if best_labels is None:
    print("❌ Не удалось найти подходящий eps, выбираем максимальный silhouette score без ограничения 0.5.")
    best_score = -1
    for eps in tqdm(EPS_GRID, desc="Перебор eps fallback"):
        db = DBSCAN(eps=eps, min_samples=MIN_SAMPLES, metric='euclidean')
        labels = db.fit_predict(reduced_embeddings)
        mask = labels != -1
        n_clusters = len(set(labels[mask]))

        if n_clusters >= 2 and np.any(mask):
            try:
                score = silhouette_score(reduced_embeddings[mask], labels[mask])
                if score > best_score:
                    best_score = score
                    best_eps = eps
                    best_labels = labels
            except:
                continue

print(f"\n✅ Лучшие параметры:")
print(f"  eps = {best_eps:.2f}")
print(f"  min_samples = {MIN_SAMPLES}")
print(f"  Silhouette Score = {best_score:.3f}")
labels = best_labels

# === Визуализация UMAP ===
print("Выполняется визуализация через UMAP...")
umap_reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=2, random_state=42)
embedding_2d = umap_reducer.fit_transform(reduced_embeddings)

# === Построение графика кластеров ===
plt.figure(figsize=(12, 8))
unique_labels = set(labels)
colors = plt.cm.tab20(np.linspace(0, 1, len(unique_labels)))

for label, color in zip(unique_labels, colors):
    idx = labels == label
    label_name = f"Кластер {label}" if label != -1 else "Шум"
    plt.scatter(
        embedding_2d[idx, 0], embedding_2d[idx, 1],
        label=label_name,
        alpha=0.6,
        s=40,
        c=[color]
    )

plt.title("Кластеры комментариев (UMAP + DBSCAN)")
plt.legend(loc='best', fontsize='small')
plt.xlabel("UMAP-1")
plt.ylabel("UMAP-2")
plt.grid(True)
plt.tight_layout()
plt.show()

# === Вывод кластеров ===
clusters = defaultdict(list)
for comment, label in zip(comments, labels):
    clusters[label].append(comment)

print("\nРезультаты кластеризации:")
for label, cluster_comments in clusters.items():
    if label == -1:
        continue
    print(f"\nКластер {label} — {len(cluster_comments)} комментариев")
    for c in cluster_comments[:5]:
        print(f"  - {c}")

# === Статистика ===
total = len(comments)
outliers = len(clusters.get(-1, []))
n_clusters = len(set([l for l in labels if l != -1]))
print(f"\n📊 Кластеров найдено: {n_clusters}")
print(f"🧹 Выбросов: {outliers} из {total} ({outliers / total:.1%})")
print(f"📈 Лучший Silhouette Score: {best_score:.3f}")