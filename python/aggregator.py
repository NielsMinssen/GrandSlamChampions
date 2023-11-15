import pandas as pd

# Assuming you have read your CSV data into a DataFrame called `df`
df = pd.read_csv('./data/tennis/scrap_results.csv')

# Group by 'WINNER' and then aggregate the results
aggregated_data = df.groupby(['WINNER','TOURNAMENT']).agg({
    'YEAR': list,  # Collect all the years they won
    'NATIONALITY': 'first',  # Assuming nationality does not change
    'WINNER': 'size' , # Count the number of wins
    'AGE':'first',
    'HEIGHT':'first'
}).rename(columns={'WINNER': 'NBWINS', 'YEAR': 'YEARS_WON'})

# Reset index to flatten the DataFrame from multiindex
aggregated_data.reset_index(inplace=True)

print(aggregated_data)

aggregated_data.to_csv('./data/tennis/scrap_results_aggregated.csv')