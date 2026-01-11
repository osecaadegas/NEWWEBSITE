export default function SubscriptionTab({ subscription }) {
  return (
    <div className="tab-content">
      <h3>Subscription</h3>
      {subscription ? (
        <div className="subscription-info">
          <p><strong>Status:</strong> {subscription.status}</p>
          <p><strong>Plan:</strong> {subscription.plan?.name || 'Free Trial'}</p>
          {subscription.trial_end && (
            <p><strong>Trial ends:</strong> {new Date(subscription.trial_end).toLocaleDateString()}</p>
          )}
          {subscription.current_period_end && (
            <p><strong>Renews:</strong> {new Date(subscription.current_period_end).toLocaleDateString()}</p>
          )}
        </div>
      ) : (
        <p>Loading subscription...</p>
      )}
    </div>
  );
}
