#  Household Electricity Consumption Analysis

EnergyScope is a web-based machine learning project designed to analyze household electricity consumption and identify energy usage patterns.

The project uses **K-Means Clustering** to group electricity consumption into low, medium, and high usage patterns. It also provides an interactive dashboard to visualize energy consumption throughout the day and compare electricity usage across appliance groups.

## Features

- Interactive electricity consumption dashboard
- Low, medium, and high consumption pattern analysis
- Daily peak usage hour identification
- Appliance group energy consumption comparison
- Interactive charts and visualizations
- 12-hour and 24-hour time formats

## Technologies Used

- **Python** — Data processing and machine learning
- **Pandas & NumPy** — Data cleaning and feature engineering
- **Scikit-learn** — K-Means clustering and preprocessing
- **FastAPI** — Backend API
- **HTML, CSS & JavaScript** — Frontend development
- **Matplotlib & Seaborn** — Exploratory data analysis

## Machine Learning

Three clustering algorithms were evaluated:

1. K-Means Clustering
2. DBSCAN
3. Hierarchical Clustering

K-Means was selected as the final model because it provided interpretable consumption patterns and achieved better cluster separation than Hierarchical Clustering in the controlled comparison.

**Final Model:**
- Algorithm: K-Means
- Preprocessing: StandardScaler
- Number of clusters: 3
- Silhouette Score: Approximately 0.53

## Dataset

The project uses the **Individual Household Electric Power Consumption** dataset from the UCI Machine Learning Repository.

The original dataset contains household electricity measurements recorded between December 2006 and November 2010.

The measurements were cleaned and aggregated into hourly observations for clustering and visualization.

Dataset: https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption

## Project Results

The model identified three main electricity consumption patterns:

| Consumption Pattern | Average Power |
|---|---|
| Low | 0.515 kW |
| Medium | 1.879 kW |
| High | 3.017 kW |

The analysis also identified periods of higher electricity demand and differences in energy usage across appliance groups.

## Running the Project

Install the required packages:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python -m uvicorn app:app --reload
```

Open the dashboard:

http://127.0.0.1:8002?utm_source=chatgpt.com

The website requires the saved model pipeline, metadata, and processed dashboard data to be placed in the `website_artifacts` directory.

## Limitations

The model was trained on electricity data from a single household. Its consumption categories may not generalize directly to other households. Appliance-level consumption is represented by groups rather than individual devices.

## Future Improvements

- Support additional household datasets
- Improve clustering and feature engineering
- Add live smart-meter integration
- Develop personalized energy-saving recommendations

## Project Purpose

This project was developed to gain practical experience in unsupervised machine learning, data preprocessing, model evaluation, and deploying machine learning results through a web application.
