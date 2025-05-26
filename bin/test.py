from sklearn.metrics import silhouette_score

best_eps = None
best_score = -1

for candidate_eps in np.linspace(0.1, 0.7, 20):  # перебираем значения
    clustering = DBSCAN(eps=candidate_eps, min_samples=MIN_SAMPLES, metric='cosine')
    labels = clustering.fit_predict(embeddings)
    if len(set(labels)) > 2 and -1 in labels:
        core_mask = labels != -1
        score = silhouette_score(embeddings[core_mask], labels[core_mask], metric='cosine')
        if score > best_score:
            best_score = score
            best_eps = candidate_eps

print(f"Выбран eps по лучшему silhouette: {best_eps}, score = {best_score:.3f}")