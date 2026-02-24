Our main task is to determine the applicable sales tax rate and compute sales tax for wellness kit purchases based on the customer’s location in the New York State. We treat the kits as non-excise goods (i.e., no alcohol, tobacco, or other excisable items), so the calculation relies on general sales tax rates across relevant jurisdictions.

We use a ZIP-based approach. To map locations to jurisdictions, we built a lightweight dataset for New York State using the U.S. Census Bureau 2025 TIGER/Line [shapefiles for States (and equivalents)](https://www.census.gov/cgi-bin/geo/shapefiles/index.php?year=2025&layergroup=States+%28and+equivalent%29) and [ZIP Code Tabulation Areas (ZCTAs)](https://www.census.gov/cgi-bin/geo/shapefiles/index.php?year=2025&layergroup=ZIP+Code+Tabulation+Areas) (links are available only with US VPN), which is USPS ZIP codes for statistical purposes. This derived dataset contains only NYS ZIP/ZCTA coverage and is significantly smaller than the original national files.

For sales tax rates by jurisdiction, we use [Avalara’s rate tables](https://www.avalara.com/taxrates/en/download-tax-tables.html), a widely adopted source of U.S. sales tax data.

