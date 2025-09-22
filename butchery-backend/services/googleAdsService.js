const { GoogleAdsApi } = require("google-ads-api");

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
});

const getCustomer = (customer_id, refresh_token) => {
  return client.Customer({
    customer_id,
    refresh_token
  });
};

const getCampaignStats = async (customer_id, refresh_token) => {
  const customer = getCustomer(customer_id, refresh_token);

  return await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.click_through_rate,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE campaign.status = 'ENABLED'
    LIMIT 10
  `);
};

module.exports = {
  getCampaignStats
};
