import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { TextField } from '@consta/uikit/TextField';
import { Text } from '@consta/uikit/Text';
import { Button } from '@consta/uikit/Button';
import { Theme, presetGpnDefault, presetGpnDark } from '@consta/uikit/Theme';
import { Switch } from '@consta/uikit/Switch';

function App() {
  const [contentId, setContentId] = useState('');
  const [clusters, setClusters] = useState([]);
  const [view, setView] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { text: 'Привет! Введите адрес видео, чтобы получить комментарии.', sender: 'bot' }
  ]);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [history, setHistory] = useState([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const fetchItems = async (id: any) => {
    setLoading(true);
    setClusters([]);
    setView([]);
    
    try {
      const response = await fetch('http://localhost:4444/api/getClusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      const data = await response.json();
      setClusters(data.clusters);
      setView(data.view);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: 'Комментарии успешно получены и кластеризованы.', sender: 'bot' }
      ]);
      setHistory((prevHistory: any): any => [
        ...prevHistory,
        { contentId, clusters: data.clusters, view: data.view }
      ]);
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: 'Ошибка при получении данных.', sender: 'bot' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handle = () => {
    const match = contentId.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : '';
    if (videoId) {
      setMessages(prevMessages => [
        ...prevMessages,
        { text: `Адрес видео: ${contentId}`, sender: 'user' },
        { text: 'Получаю комментарии...', sender: 'bot' }
      ]);
      fetchItems(videoId);
    } else {
      setMessages(prevMessages => [
        ...prevMessages,
        { text: 'Пожалуйста, введите корректный адрес видео.', sender: 'bot' }
      ]);
    }
  };

  const handleHistoryClick = (historyItem: any) => {
    setContentId(historyItem.contentId);
    setClusters(historyItem.clusters);
    setView(historyItem.view);
    setMessages(prevMessages => [
      ...prevMessages,
      { text: `Возвращаюсь к кластеризации для видео: ${historyItem.contentId}`, sender: 'bot' }
    ]);
  };

  const clearHistory = () => {
    setHistory([]);
    setClusters([]);
    setView([]);
    setMessages([{ text: 'Привет! Введите адрес видео, чтобы получить комментарии.', sender: 'bot' }]);
  };

  // const hashCode = (str: any) => {
  //   let hash = 0;
  //   for (let i = 0; i < str.length; i++) {
  //     hash = str.charCodeAt(i) + ((hash << 5) - hash);
  //   }
  //   return hash;
  // };

  // const generateCoordinates = (text: any) => {
  //   const x = Math.abs(hashCode(text)) % 100;
  //   const y = Math.abs(hashCode(text.split('').reverse().join(''))) % 100;
  //   return [x, y];
  // };

  const gridSize = Math.ceil(Math.sqrt(clusters.length));
  const spacing = 100;
  const startX = 50;
  const startY = 50;

  const data = clusters.map((cluster: any, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const x = startX + col * spacing;
    const y = startY + row * spacing;
    const clusterSize = 20 + cluster.elements.slice(0, 16).length * 10;
    return {
      value: [x, y],
      symbolSize: clusterSize,
      name: `Кластер ${cluster.cluster}`,
      tooltip: {
        formatter: () => {
          return `
            <strong>Кластер ${cluster.cluster}</strong><br/>
            Количество элементов: ${clusterSize}<br/>
            ${cluster.elements.join('<br/>')}
          `;
        }
      }
    };
  });

  return (
    <Theme preset={isDarkTheme ? presetGpnDark : presetGpnDefault}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        backgroundColor: isDarkTheme ? '#121212' : '#f5f5f5',
        color: isDarkTheme ? '#fff' : '#000'
      }}>
        {isSidebarVisible && (
          <div style={{ width: '300px', borderRight: '1px solid #ccc', backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff', padding: '20px', overflowY: 'auto' }}>
            <Text weight='bold'>История диалогов</Text>
            <Button
              label="Очистить историю"
              onClick={clearHistory}
              style={{ marginBottom: '20px' }}
            />
            {history.map((historyItem: any, index: any) => (
              <div key={index} style={{ marginBottom: '10px', cursor: 'pointer', padding: '10px', borderRadius: '5px', backgroundColor: isDarkTheme ? '#333' : '#f0f0f0' }} onClick={() => handleHistoryClick(historyItem)}>
                <Text>{historyItem.contentId}</Text>
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #ccc', backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight='bold'>Чат с кластеризацией комментариев</Text>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Text style={{ marginRight: '10px' }}>Темная тема</Text>
                <Switch checked={isDarkTheme} onChange={() => setIsDarkTheme(!isDarkTheme)} />
                <Button
                  label={isSidebarVisible ? 'Скрыть сайдбар' : 'Показать сайдбар'}
                  onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                  style={{ marginLeft: '10px' }}
                />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>
            {messages.map((message, index) => (
              <div key={index} style={{ marginBottom: '10px', textAlign: message.sender === 'user' ? 'right' : 'left' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: message.sender === 'user' ? '#5470C6' : (isDarkTheme ? '#333' : '#f0f0f0'),
                  color: message.sender === 'user' ? '#fff' : (isDarkTheme ? '#fff' : '#000')
                }}>
                  {message.text}
                </div>
              </div>
            ))}
            {!!clusters.length && (
              <div style={{ marginTop: '20px' }}>
                <Text weight='bold'>Кластеры комментариев:</Text>
                {clusters.map((cluster: any) => (
                  <div key={cluster.cluster} style={{ marginBottom: '20px' }}>
                    <Text weight='bold'>Кластер: {cluster.cluster}</Text>
                    <div style={{ marginLeft: '20px' }}>
                      {cluster.elements.map((elem: any, index: any) => (
                        <Text key={index}> - {elem}</Text>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!!view.length && (
              <div style={{ width: '100%', height: '400px', margin: '20px 0', backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                <ReactECharts option={{
                  backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
                  xAxis: {
                    type: 'value',
                    show: true,
                    axisLine: {
                      lineStyle: {
                        color: isDarkTheme ? '#555' : '#ccc'
                      }
                    }
                  },
                  yAxis: {
                    type: 'value',
                    show: true,
                    axisLine: {
                      lineStyle: {
                        color: isDarkTheme ? '#555' : '#ccc'
                      }
                    }
                  },
                  tooltip: {
                    trigger: "item",
                    formatter: function (params: any) {
                      return `Текст: ${params.value[2]}`;
                    }
                  },
                  series: [
                    {
                      type: 'scatter',
                      symbolSize: 10,
                      data: view,
                      itemStyle: {
                        color: '#5470C6'
                      }
                    }
                  ]
                }} />
              </div>
            )}
            {!!clusters.length && (
              <div style={{ width: '100%', height: '400px', margin: '20px 0', backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                <ReactECharts option={{
                  backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
                  title: {
                    text: 'Визуализация кластеров комментариев',
                    left: 'center',
                    textStyle: {
                      color: isDarkTheme ? '#fff' : '#000'
                    }
                  },
                  tooltip: {
                    trigger: 'item'
                  },
                  xAxis: {
                    min: 0,
                    max: startX + gridSize * spacing,
                    show: false
                  },
                  yAxis: {
                    min: 0,
                    max: startY + gridSize * spacing,
                    show: false
                  },
                  series: [
                    {
                      type: 'scatter',
                      data: data,
                      label: {
                        show: true,
                        formatter: (param: any) => param.data.name,
                        position: 'top',
                        color: isDarkTheme ? '#fff' : '#000'
                      },
                      itemStyle: {
                        color: '#5470C6'
                      }
                    }
                  ]
                }} />
              </div>
            )}
          </div>
          <div style={{
            padding: '20px',
            borderTop: '1px solid #ccc',
            backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Введите адрес видео"
                value={contentId}
                onChange={(value: any) => {
                  setContentId(value);
                }}
                placeholder="Введите адрес видео..."
                disabled={loading}
                style={{ flex: 1 }}
              />
              <Button
                label="Отправить"
                onClick={handle}
                disabled={loading}
                style={{ marginLeft: '10px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </Theme>
  );
}

export default App;