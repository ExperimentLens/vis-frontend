import { Handler } from 'vega-tooltip';
import type { IRun } from '../../../shared/models/experiment/run.model';
import { WF_INFO_TIP_CLASS } from './ComparativeAnalysis/workflow-info-tooltip';
import type { WorkflowTooltipPalette } from './ComparativeAnalysis/workflow-info-tooltip';

interface ExperimentExplainabilityTooltipProps {
  workflowIds: string[];
  runs: IRun[];
  workflowColors: Record<string, string>;
  xAxisName?: string;
  yAxisName?: string;
  axisType?: string;
  selectedFeature?: string;
  selectedFeature2?: string;
  experimentId?: string;
  palette: WorkflowTooltipPalette;
}

export const createExperimentExplainabilityTooltipHandler = ({
  workflowIds,
  runs,
  workflowColors,
  xAxisName = 'xAxis default',
  yAxisName = 'yAxis default',
  axisType,
  selectedFeature,
  selectedFeature2,
  experimentId,
  palette
}: ExperimentExplainabilityTooltipProps) => {
  const runById = new Map<string, IRun>();

  runs.forEach(r => runById.set(r.id, r));

  const allParamNames = Array.from(
    new Set(
      workflowIds.flatMap(wid =>
        runById.get(wid)?.params?.map(p => p.name) || []
      )
    )
  ).sort();

  const allMetricNames = Array.from(
    new Set(
      workflowIds.flatMap(wid =>
        runById.get(wid)?.metrics?.map(m => m.name) || []
      )
    )
  ).sort();

  const handler = new Handler({
    sanitize: (v: unknown) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'number') return v.toFixed(4);

      return String(v);
    },
    formatTooltip: (value: Record<string, unknown>, sanitize) => {
      let xValue = '';
      let yValue = '';
      let zValue = '';

      if (value[xAxisName]) {
        xValue = String(value[xAxisName]);
      } else if (value.x !== undefined) {
        xValue = String(value.x);
      } else if (value.feature1 !== undefined) {
        xValue = String(value.feature1);
      } else {
        const keys = Object.keys(value).filter(key =>
          key !== yAxisName &&
          key !== 'y' &&
          key !== 'value' &&
          key !== 'Average Predicted Value' &&
          key !== 'z' &&
          key !== '__targetMetric'
        );

        if (keys.length > 0) {
          xValue = String(value[keys[0]]);
        }
      }

      if (value[yAxisName]) {
        yValue = String(value[yAxisName]);
      } else if (value.y !== undefined) {
        yValue = String(value.y);
      } else if (value.feature2 !== undefined) {
        yValue = String(value.feature2);
      } else {
        const keys = Object.keys(value).filter(key =>
          key !== xAxisName &&
          key !== 'x' &&
          key !== 'value' &&
          key !== 'Average Predicted Value' &&
          key !== 'z' &&
          key !== '__targetMetric' &&
          key !== xValue
        );

        if (keys.length > 0) {
          yValue = String(value[keys[0]]);
        }
      }

      if (value.z !== undefined) {
        zValue = String(value.z);
      } else if (value.value !== undefined) {
        zValue = String(value.value);
      } else if (value['Average Predicted Value'] !== undefined) {
        zValue = String(value['Average Predicted Value']);
      }

      if (!xValue && !yValue) {
        const availableData = Object.entries(value)
          .map(([key, val]) => `<div><strong>${sanitize(key)}:</strong> ${sanitize(String(val))}</div>`)
          .join('');

        return `
          <div class="${WF_INFO_TIP_CLASS}" style="max-width: 400px; background-color: ${palette.bg}; color: ${palette.text}; border: 1px solid ${palette.border}; border-radius: 8px; padding: 8px; box-shadow: ${palette.shadow};">
            <div style="margin-bottom: 8px; font-weight: bold;">Available Data:</div>
            ${availableData}
          </div>
        `;
      }

      const filteredWorkflowIds = (selectedFeature && selectedFeature2)
        ? workflowIds.filter(wid => {
          const run = runById.get(wid);

          if (!run) return false;

          const param1 = run.params?.find(p => p.name === selectedFeature);
          const param2 = run.params?.find(p => p.name === selectedFeature2);

          if (!param1 || !param2) return false;

          const param1Value = String(param1.value);
          const param2Value = String(param2.value);
          const hoveredXValue = String(xValue);
          const hoveredYValue = String(yValue);

          return param1Value === hoveredXValue && param2Value === hoveredYValue;
        })
        : selectedFeature
          ? workflowIds.filter(wid => {
            const run = runById.get(wid);

            if (!run) return false;

            const param = run.params?.find(p => p.name === selectedFeature);

            if (!param) return false;

            const paramValue = String(param.value);
            const hoveredValue = String(xValue);

            return paramValue === hoveredValue;
          })
          : workflowIds;
      const compareKey = `compare-${Date.now()}`;

      const compareLink = experimentId
        ? `/${experimentId}/monitoring?tab=1&compareId=${compareKey}`
        : '#';
      const header = `
        <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid ${palette.border};">
          ${selectedFeature ? `<div style="font-size:0.72rem;font-family:inherit;font-weight:700;">${sanitize(selectedFeature)}: ${sanitize(xValue)}</div>` : ''}
          ${selectedFeature2 ? `<div style="font-size:0.72rem;font-family:inherit;font-weight:700;">${sanitize(selectedFeature2)}: ${sanitize(yValue)}</div>` : ''}
          ${!selectedFeature2 && yValue ? `<div style="font-size:0.72rem;font-family:inherit;font-weight:700;">${sanitize(yAxisName)} ${(Number(sanitize(yValue)).toFixed(4))}</div>` : ''}
          ${zValue ? `<div style="font-size:0.72rem;font-family:inherit;font-weight:700;">Value: ${Number(sanitize(zValue)).toFixed(4)}</div>` : ''}
          ${value['__targetMetric'] ? `<div style="font-size:0.72rem;font-family:inherit;font-weight:700;">Target Metric: ${sanitize(String(value['__targetMetric']))}</div>` : ''}
        </div>
      `;

      const headerCells = [
        `<th style="text-align:left; padding:4px 8px; color:${palette.secondaryText};">Workflow</th>`,
        ...allParamNames.map(
          n => `<th style="text-align:left; padding:4px 8px; color:${palette.secondaryText};">${sanitize(n)}</th>`
        ),
        ...allMetricNames.map(
          n => `<th style="text-align:right; padding:4px 8px; color:${palette.secondaryText};">${sanitize(n)}</th>`
        ),
      ].join('');

      const body = filteredWorkflowIds.map(wid => {
        const color = workflowColors[wid] || '#3f51b5';

        const params = runById.get(wid)?.params ?? [];
        const paramMap = new Map(params.map(p => [p.name, p.value]));

        const metrics = runById.get(wid)?.metrics ?? [];
        const metricMap = new Map(metrics.map(m => [m.name, m.value]));

        const paramCells = allParamNames
          .map(name => {
            const paramValue = paramMap.get(name);
            const isSelectedFeature = name === selectedFeature || name === selectedFeature2;
            const style = isSelectedFeature ? `font-weight: bold; background-color: ${palette.bg};` : '';

            return `<td style="padding:4px 8px; vertical-align:top; ${style}">${sanitize(paramValue ?? '')}</td>`;
          })
          .join('');

        const metricCells = allMetricNames
          .map(name => {
            const metricValue = metricMap.get(name);

            return `<td style="text-align:right; padding:4px 8px; vertical-align:top;">${
              typeof metricValue === 'number' ? metricValue.toFixed(4) : sanitize(metricValue ?? '')
            }</td>`;
          })
          .join('');

        return `
          <tr>
            <td style="white-space:nowrap; vertical-align:top; padding:4px 8px;">
              <span style="display:inline-block;width:12px;height:12px;background-color:${sanitize(color)};border-radius:2px;margin-right:6px;"></span>
              ${sanitize(wid)}
            </td>
            ${paramCells}
            ${metricCells}
          </tr>
        `;
      }).join('');

      if (filteredWorkflowIds.length === 0) {
        let filterMessage: string;

        if (selectedFeature && selectedFeature2) {
          filterMessage = `No workflows found with ${selectedFeature} = ${sanitize(xValue)} and ${selectedFeature2} = ${sanitize(yValue)}`;
        } else if (selectedFeature) {
          filterMessage = `No workflows found with ${selectedFeature} = ${sanitize(xValue)}`;
        } else {
          filterMessage = 'No workflows found';
        }

        return `
          <div class="${WF_INFO_TIP_CLASS}" style="max-width: 600px; white-space: normal; background-color: ${palette.bg}; color: ${palette.text}; border: 1px solid ${palette.border}; border-radius: 8px; padding: 8px; box-shadow: ${palette.shadow};">
            ${header}
            <div style="color: ${palette.secondaryText}; font-style: italic; margin-top: 8px;">
              ${filterMessage}
            </div>
          </div>
        `;
      }

      let titleText: string;

      if (selectedFeature && selectedFeature2) {
        titleText = `Workflows with ${selectedFeature} = ${sanitize(xValue)} and ${selectedFeature2} = ${sanitize(yValue)} (${filteredWorkflowIds.length} of ${workflowIds.length}):`;
      } else if (selectedFeature) {
        titleText = `Workflows with ${selectedFeature} = ${sanitize(xValue)} (${filteredWorkflowIds.length} of ${workflowIds.length}):`;
      } else {
        titleText = `All Workflows (${workflowIds.length}):`;
      }

      return `
        <div class="${WF_INFO_TIP_CLASS}" style="max-width: 800px; max-height: 400px; white-space: normal; display:flex; flex-direction:column; background-color: ${palette.bg}; color: ${palette.text}; border: 1px solid ${palette.border}; border-radius: 8px; padding: 8px; box-shadow: ${palette.shadow};">
          ${header}
          <div style="font-size:0.72rem;font-family:inherit; margin-top: 8px;">
            <strong>${titleText}</strong>
          </div>

          <div style="margin-top:6px; flex:1 1 auto; overflow:auto; border:1px solid ${palette.border}; border-radius:4px;">
            <table style="border-collapse:collapse; font-size:11px; width:max-content; min-width:100%;">
              <thead>
                <tr style="border-bottom: 1px solid ${palette.border};">${headerCells}</tr>
              </thead>
              <tbody>${body}</tbody>
            </table>
          </div>

          ${filteredWorkflowIds.length > 0 ? `
            <div style="flex:0 0 auto; margin-top: 12px; padding-top: 12px; border-top: 1px solid ${palette.border}; text-align: center;">
              <a 
                href="${compareLink}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display: inline-block;
                  background-color: ${palette.link};
                  color: white;
                  padding: 6px 12px;
                  border-radius: 4px;
                  text-decoration: none;
                  font-size: 12px;
                  font-weight: 500;
                  cursor: pointer;
                "
                onclick='
                  (function(event) {
                    event.preventDefault(); // ensure we save before navigating
                    const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
                    function setCache(key, data, ttl = DEFAULT_TTL) {
                      const payload = { data: data, expires: Date.now() + ttl };
                      localStorage.setItem(key, JSON.stringify(payload));
                    }
                    const compareData = ${JSON.stringify({ workflowIds: filteredWorkflowIds })};
                    setCache("${compareKey}", compareData);
                    window.open("${compareLink}", "_blank", "noopener,noreferrer");
                  })(event);
                '
              >
                Compare ${filteredWorkflowIds.length} Workflow${filteredWorkflowIds.length > 1 ? 's' : ''}
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }
  });

  return handler.call;
};
