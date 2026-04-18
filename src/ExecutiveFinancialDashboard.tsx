import { gql, useQuery } from "@apollo/client";
import React from "react";

const DASHBOARD_QUERY = gql`
  query ExecutiveDashboard {
    financialProfile {
      overallScore
      creditScore
      healthScore
      stressLevel
      trendDirection
      projected6MonthGrowth
      summary

      consumptionCurrentMonth
      consumptionPreviousMonth
      consumptionVariationPercentage
      consumptionRiskLevel
      consumptionAlert
    }

    householdCreditScore {
      creditScore
      riskCategory
      outlook
    }

    financialStressIndicator {
      stressScore
      level
    }

    advancedForecast {
      projectedNextMonth
      projectedNext6Months
      confidenceLevel
    }

    proactiveAlerts {
      type
      message
      severity
    }

    netWorthModel {
      totalAssets
      totalLiabilities
      netWorth
      netWorthTrend
    }
  }
`;

export default function ExecutiveFinancialDashboard() {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY);

  if (loading) return <p>Cargando dashboard financiero...</p>;
  if (error) return <p>Error cargando datos financieros.</p>;

  const profile = data.financialProfile;
  const credit = data.householdCreditScore;
  const stress = data.financialStressIndicator;
  const forecast = data.advancedForecast;
  const netWorth = data.netWorthModel;
  const alerts = data.proactiveAlerts;

  return (
    <div style={{ padding: 24 }}>
      <h1>📊 Executive Financial Dashboard</h1>

      <section>
        <h2>🏦 Perfil Financiero</h2>
        <p><strong>Score General:</strong> {profile.overallScore.toFixed(1)}</p>
        <p><strong>Credit Score:</strong> {credit.creditScore.toFixed(1)} ({credit.riskCategory})</p>
        <p><strong>Salud Financiera:</strong> {profile.healthScore.toFixed(1)}</p>
        <p><strong>Nivel de Estrés:</strong> {stress.level}</p>
        <p><strong>Tendencia:</strong> {profile.trendDirection}</p>
        <p><strong>Resumen:</strong> {profile.summary}</p>
      </section>

      <section>
        <h2>🛒 Consumo del Hogar</h2>
        <p>
          <strong>Consumo mes actual:</strong> $
          {profile.consumptionCurrentMonth.toFixed(0)}
        </p>
        <p>
          <strong>Mes anterior:</strong> $
          {profile.consumptionPreviousMonth.toFixed(0)}
        </p>
        <p>
          <strong>Variación:</strong>{" "}
          {profile.consumptionVariationPercentage.toFixed(1)}%
        </p>
        <p>
          <strong>Nivel de riesgo:</strong>{" "}
          <span
            style={{
              color:
                profile.consumptionRiskLevel === "CRITICAL"
                  ? "red"
                  : profile.consumptionRiskLevel === "WARNING"
                  ? "orange"
                  : "green",
              fontWeight: "bold",
            }}
          >
            {profile.consumptionRiskLevel}
          </span>
        </p>

        {profile.consumptionAlert && (
          <p style={{ color: "red" }}>
            ⚠️ {profile.consumptionAlert}
          </p>
        )}
      </section>

      <section>
        <h2>📈 Proyecciones</h2>
        <p><strong>Próximo mes:</strong> ${forecast.projectedNextMonth.toFixed(0)}</p>
        <p><strong>Próximos 6 meses:</strong> ${forecast.projectedNext6Months.toFixed(0)}</p>
        <p><strong>Confianza:</strong> {forecast.confidenceLevel.toFixed(1)}%</p>
      </section>

      <section>
        <h2>💰 Patrimonio Neto</h2>
        <p><strong>Activos:</strong> ${netWorth.totalAssets.toFixed(0)}</p>
        <p><strong>Pasivos:</strong> ${netWorth.totalLiabilities.toFixed(0)}</p>
        <p><strong>Net Worth:</strong> ${netWorth.netWorth.toFixed(0)} ({netWorth.netWorthTrend})</p>
      </section>

      <section>
        <h2>🚨 Alertas</h2>
        {alerts.map((alert: any, index: number) => (
          <div key={index} style={{ marginBottom: 8 }}>
            <strong>{alert.severity}</strong>: {alert.message}
          </div>
        ))}
      </section>
    </div>
  );
}
