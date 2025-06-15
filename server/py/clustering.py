from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA
from sklearn.preprocessing import normalize
from sklearn.metrics import silhouette_score
from sklearn.cluster import DBSCAN
from googleapiclient.discovery import build
from collections import defaultdict
import json
import numpy as np
import umap
import matplotlib.pyplot as plt
from tqdm import tqdm
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# === НАСТРОЙКИ ===

VIDEO_ID = sys.argv[1]
# VIDEO_ID = '8Fv6fJXjxao'      # ← Замени на нужный ID

YOUTUBE_API_KEY = 'AIzaSyB2m6IUTzz94_tMFAuhOy-ZQUtknCfbLQM'  # ← Замени на свой ключ
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
    
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
embeddings = model.encode(comments, show_progress_bar=True)
normalized_embeddings = normalize(embeddings)

pca = PCA(n_components=PCA_DIM)
reduced_embeddings = pca.fit_transform(normalized_embeddings)

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

labels = best_labels

umap_reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=2, random_state=42)
embedding_2d = umap_reducer.fit_transform(reduced_embeddings)

# embedding_2d

# === Вывод кластеров ===
clusters = defaultdict(list)
for comment, label in zip(comments, labels):
    clusters[str(label)].append(comment)

# === Статистика ===
total = len(comments)
outliers = len(clusters.get(-1, []))
n_clusters = len(set([l for l in labels if l != -1]))

# --- Обеспечиваем корректную кодировку stdout ---
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# === Группировка по кластерам ===
cluster_map = defaultdict(list)
for idx, (comment, label) in enumerate(zip(comments, labels)):
    if label != -1:
        cluster_map[int(label)].append(comment)

# === Кластеры в нужной структуре ===
clusters_output = [
    {
        "cluster": cluster_id,
        "elements": elements
    }
    for cluster_id, elements in cluster_map.items()
]

# === Нормализация координат embedding_2d ===
embedding_min = embedding_2d.min(axis=0)
embedding_max = embedding_2d.max(axis=0)
embedding_range = embedding_max - embedding_min
embedding_norm = (embedding_2d - embedding_min) / embedding_range

# === Визуализация вида ===
view_output = [
    [float(embedding_norm[i][0]), float(embedding_norm[i][1]), comments[i]]
    for i in range(len(comments))
]
# === Финальный результат ===
result = {
    "clusters": clusters_output,
    "view": view_output
}

# === Преобразование numpy-типов ===
def convert_numpy(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    return str(obj)

# === Вывод JSON в stdout ===
print(json.dumps(result, ensure_ascii=False, indent=2, default=convert_numpy))