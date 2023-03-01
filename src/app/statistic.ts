export class Score {
  score: number;
  name: string;
  perClassScore: Array<number>;
  macroAverage: number;
  microAverage: number;
  constructor(setting: {
    name: string;
    score?: number;
    perClassScore?: Array<number>;
    macroAverage?: number;
    microAverage?: number;
  })
  {
    this.name = setting.name;
    if (setting.score != undefined) this.score = setting.score;
    if (setting.perClassScore) this.perClassScore = setting.perClassScore;
    if (setting.macroAverage != undefined)
      this.macroAverage = setting.macroAverage;
    if (setting.microAverage != undefined)
      this.microAverage = setting.microAverage;
  }
  update(other:{score?:number, perClassScore?:Array<number>; macroAverage?:number, microAverage?:number}){
    if (other.score != undefined) this.score = other.score;
    if (other.perClassScore) this.perClassScore = other.perClassScore;
    if (other.macroAverage != undefined)
      this.macroAverage = other.macroAverage;
    if (other.microAverage != undefined)
      this.microAverage = other.microAverage;
  }
  format(){
    return {score:this.score, perClassScore:this.perClassScore, macroAverage:this.macroAverage, microAverage:this.microAverage}
  }
}

export class Stats {
  cm: Array<Array<number>>;
  n_classes: number;
  sumRows: Array<number>;
  sumCols: Array<number>;
  union: Array<number>;
  diagValues: Array<number>;
  mcc_nominator: number = 0;
  total_correct_predicted : number = 0;
  total_video_length : number = 0;
  x: number;
  y:number;
  cohen_kappa: number;
  S: number;
  private filteredIndicesFromAvg: Array<number>

  constructor(
    confMat: Array<Array<number>>,
    ignoreFirstClassFromAverage: boolean = true
  ) {
    this.cm = confMat;
    this.n_classes = confMat.length;

    this.diagValues = new Array<number>(this.n_classes);
    this.union = new Array<number>(this.n_classes);

    this.sumCols = this.cm.map((r) => r.reduce((a, b) => a + b));
    this.sumRows = this.cm.reduce((a, b) => a.map((x, i) => x + b[i]));
    this.S = this.sumRows.reduce((a, b) => a + b);
    this.x = this.S * this.S;
    this.y = this.S * this.S;
    this.cohen_kappa = this.S * this.S;
    this.filteredIndicesFromAvg = new Array<number>()
    if(ignoreFirstClassFromAverage) this.filteredIndicesFromAvg.push(0)
    for (let i = 0; i < this.n_classes; i++) {
      this.diagValues[i] = this.cm[i][i];
      this.union[i] = this.sumCols[i] + this.sumRows[i] - this.diagValues[i];

      if(this.sumCols[i]==0 && this.sumRows[i]==0){
        this.filteredIndicesFromAvg.push(i)
      }

    }

  }

  static getStats(
    P: number,
    N: number,
    TP: number,
    TN: number,
    FP: number,
    FN: number
  ): Map<string, number> {
    var statistics = new Map<string, number>();
    let precision = TP / (TP + FP);
    let sensitivity = TP / (TP + FN);
    let f1 = 0;
    let b = 1;
    f1 = (1 + b * b) * (precision * sensitivity) / (b * b * precision + sensitivity);
    if(precision == 0 || isNaN(sensitivity) || sensitivity == 0) f1 = 0;
    if(sensitivity == 0 || isNaN(precision) || precision == 0) f1 = 0;
    statistics.set('Accuracy', (TP + TN) / (TP + TN + FP + FN));
    statistics.set('Overall Accuracy', 0);
    statistics.set('Precision', precision);
    statistics.set('Sensitivity', sensitivity);
    statistics.set('F1', f1);
    statistics.set('Specificity', TN / (TN + FP));
    statistics.set('MCC', ((TP * TN) - (FP * FN)) / Math.sqrt((TP + FP) * (TP + FN) * (TN + FP) * (TN + FN)));
    statistics.set('Overlap Score', 0.0);
    return statistics;
  }
  getBinaryClassStats(): Map<string, number> {
    let N = this.sumRows[0];
    let P = this.sumRows[1];
    let TP = this.cm[1][1];
    let TN = this.cm[0][0];
    let FP = N - TN;
    let FN = (TN + FP) - (P+N);
    var statistics = Stats.getStats(P, N, TP, TN, FP, FN);
    statistics.set('Kappa', this.cohenKappa());
    statistics.set('IoU', TP / (P + FP));
    return statistics;
  }

  getMultiClassStats(): Map<string, Array<number>> {
    var statistics = new Map();
    statistics.set('IoU', new Array<number>());
    statistics.set('TP', new Array<number>());
    statistics.set('TN', new Array<number>());
    statistics.set('P', new Array<number>());
    statistics.set('N', new Array<number>());
    statistics.set('FP', new Array<number>());
    statistics.set('FN', new Array<number>());


    for (let i = 0; i < this.n_classes; i++) {
      let P = this.sumRows[i];
      let N = this.S - P;

      let TP = this.diagValues[i];
      let TN = this.S - this.union[i];
      let FP = this.sumCols[i] - this.diagValues[i];
      let FN = this.sumRows[i] - this.diagValues[i];
      let macro_acc = 0;
      if(TP != 0) macro_acc = TP/this.sumRows[i];

      this.mcc_nominator += TP * this.S - this.sumRows[i]*this.sumCols[i];
      this.x -= this.sumCols[i] * this.sumCols[i];
      this.y -= this.sumRows[i] * this.sumRows[i];
      this.cohen_kappa -= this.sumRows[i] * this.sumCols[i];

      let stats = Stats.getStats(P, N, TP, TN, FP, FN);
      stats.set('Accuracy', macro_acc);
      for (const [key, value] of stats) {
        if (!statistics.has(key)) statistics.set(key, new Array<number>());
        statistics.get(key).push(value);
      }
      statistics.get('IoU').push(TP / this.union[i]);
      if(!(this.filteredIndicesFromAvg.includes(i))){
        statistics.get('TP').push(TP);
        statistics.get('TN').push(TN);
        statistics.get('P').push(P);
        statistics.get('N').push(N);
        statistics.get('FP').push(FP);
        statistics.get('FN').push(FN);
      }
    }
    return statistics;
  }

  updateScore(overlap_score: number[], overall_acc : number[], micro_acc : number, convertNaN : boolean): Array<Score> {
    let scores = new Array<Score>();
    if (this.n_classes == 2) {
      let stats = this.getBinaryClassStats();
      for (const [key, value] of stats) {
        scores.push(new Score({name: key, score: value}));
      }
    } else {
      let stats = this.getMultiClassStats();

      let microStats = Stats.getMicroAverageScore(stats);

      let overall_accuracy = this.diagValues.reduce((a, b) => a+b);
      this.total_correct_predicted += overall_accuracy;
      this.total_video_length += this.S;

      overall_accuracy /= this.S;
      microStats.set('Overall Accuracy', overall_accuracy);

      let keys = Array.from(microStats.keys());
      for (const [key, value] of stats) {
        var weightedValues = new Array<number>();
        var avgValues = new Array<number>();
        for (let i = 0; i < value.length; i++) {
          if (!(this.filteredIndicesFromAvg.includes(i)))
            if(!convertNaN && isNaN(value[i])) value[i] = 0;
            weightedValues.push(value[i] * this.sumRows[i]);
            avgValues.push(value[i])
        }

        if (key == 'Overlap Score') {
          let args = {
            name: 'Overlap Score',
            perClassScore: overlap_score,
            macroAverage: Stats.getMacroAverageAll(overlap_score),
          };
          scores.push(new Score(args));
        }

        if (key == 'Overall Accuracy') {
          let args = {
            name: key,
            microAverage: overall_accuracy,
          };
          scores.push(new Score(args));
        }

        let mcc = this.mcc_nominator / (Math.sqrt(this.x)*Math.sqrt(this.y))

        if (key == 'MCC') {
          let args = {
            name: key,
            microAverage: mcc,
          };
          scores.push(new Score(args));

        }
        if (keys.includes(key) && key != 'Overlap Score' && key != 'MCC' && key != 'Overall Accuracy') {
          let macroAvg = Stats.getMacroAverageAll(avgValues);
          let microAvg = microStats.get(key)

          if(key == 'Precision' || key == 'Sensitivity' || key == 'F1') {
            macroAvg = Stats.getMacroAverage(avgValues)
            microAvg = weightedValues.reduce((acc, val) => {
              if (!isNaN(val)) {
                acc += val;
              }
              return acc;
            }, 0) / this.S
          }

          let args = {
            name: key,
            perClassScore: value,
            microAverage: microAvg,
            macroAverage: macroAvg,
          };
          scores.push(new Score(args));
        }

        if (key == 'IoU') {
          let arg = {
            name: key,
            perClassScore: value,
            macroAverage: Stats.getMacroAverageAll(avgValues),
          };
          let s = new Score(arg);
          scores.push(s);
        }

      }
      scores.push(new Score({name: 'Kappa', score: this.cohenKappa(), microAverage: this.mcc_nominator / this.cohen_kappa}));
    }
    return scores;
  }

  static getMicroAverageScore(
    samples: Map<string, Array<number>>
  ): Map<string, number> {
    let TP = samples.get('TP')?.reduce((a, b) => a + b) || 0;
    let FP = samples.get('FP')?.reduce((a, b) => a + b) || 0;
    let FN = samples.get('FN')?.reduce((a, b) => a + b) || 0;
    let TN = samples.get('TN')?.reduce((a, b) => a + b) || 0;
    let P = samples.get('P')?.reduce((a, b) => a + b) || 0;
    let N = samples.get('N')?.reduce((a, b) => a + b) || 0;
    return Stats.getStats(P, N, TP, TN, FP, FN);
  }

  static getMacroAverage(array: Array<number>) {
    let sum = array.reduce((acc, val) => {
      if (!isNaN(val)) {
        acc += val;
      }
      return acc;
    }, 0);

    let countOfNaN = array.filter(isNaN).length;
    let macroAverage = sum / (array.length - countOfNaN);
    return macroAverage;
  }

  static getMacroAverageAll(array: Array<number>) {
    return array.reduce((a, b) => a + b) / array.length;
  }

  cohenKappa(quadratic: boolean = false): number {
    let probAgree: number = this.diagValues.reduce((a, b) => a + b) / this.S;
    let probsRandAgree = new Array<number>(this.n_classes);
    for (let i = 0; i < this.n_classes; i++) {
      probsRandAgree[i] =
        (this.sumRows[i] * this.sumCols[i]) / (this.S * this.S);
    }
    let probRandom = probsRandAgree.reduce((a, b) => a + b);
    return (probAgree - probRandom) / (1 - probRandom);
  }

   //overlap score calculation
   static segmentArray(array: number[]) {

    let segments: any[] = [];
    let currentSegment: any[] = [array[0]];

    for (let i = 1; i < array.length; i++) {
      if (array[i] === array[i - 1]) {
        currentSegment.push(array[i]);
      } else {
        segments.push(currentSegment);
        currentSegment = [array[i]];
      }
    }
    segments.push(currentSegment);
    return segments;
  }

  //unused method
  static fillMatrix(segPredArray: any[][], segmentArr: any[], predArray: any[], startIdx: number) {
    segPredArray[1] = predArray;
    segPredArray[0].splice(startIdx, segmentArr.length, ...segmentArr);
  }

  static segmentTraversal(segPredArray: any[][], class_: any, tmpArray: any[][], j: number, segment: any[]) {
    let maxScore = 0;
    for (let i = j; i < j + segment.length; i++) {
      if (segPredArray[0][i] == class_ && tmpArray[0][i] != 12) {
          tmpArray[0][i] = 12;
      }
    }
    let count_tmp_labels = tmpArray[0].filter((val) => val == 12).length;

    if (count_tmp_labels == segment.length) {
      maxScore = this.calculateScore(tmpArray, segPredArray[1], class_);

    }


    return maxScore;
  }

   static calculateScore(arr: any[][], predictionArray: any[], classType: any) {
    let maxScore = 0;
    const groundTruthLen = arr[0].filter(val => val == 12).length;
    let predLen = 0;
    let intersection = 0;
    for (let i = 0; i < arr[0].length; i++) {
      if (predictionArray[i] == classType) {
        arr[1][i] = 12;
      }
    }

    for (let i = 0; i < arr[0].length; i++) {
      if (arr[1][i] != 12) {
        intersection = 0;
        predLen = 0;
      }
      predLen = this.calculatePredUnion(arr[1], i, predLen);
      if (arr[0][i] == arr[1][i] && arr[0][i] == 12) {
        intersection += 1;
        let union = groundTruthLen + predLen - intersection;
        let overlapScore = intersection / union;
        maxScore = Math.max(maxScore, overlapScore);
      }
    }
    return maxScore;
  }

  static calculatePredUnion(pred: any[], predIdx: number, length: number) {
    let union = length;
    if (union === 0) {
      while (predIdx < pred.length) {
        if (pred[predIdx] != 12) {
          if (union !== 0) {
            return union;
          }
          union = 0;
        } else {
          union += 1;
        }
        predIdx += 1;
      }
    }
    return union;
  }


  static calculateOverlap(groundTruth: Array<number>, prediction: Array<number>) {
    let groundTruthSet = new Set(groundTruth);
    let predictionSet = new Set(prediction);
    let overlapScoreMap = new Map<number, number>();
    let difference_pred = [...predictionSet].filter(x => !groundTruthSet.has(x));
    let difference_gt = [...groundTruthSet].filter(x => !predictionSet.has(x));
    let combined = [...new Set([...difference_pred, ...difference_gt])];
    if(combined.length != 0) {
      for (let d of combined) {
        overlapScoreMap.set(d, 0);
      }
    }

    let groundTruthSegments = this.segmentArray(groundTruth);

    let i = 1; // ROW
    let j = 0;
    let final_result = [];

    for(let segment of groundTruthSegments) {
      let class_type = segment[0]; //to check class type
      let max_score = 0; // each segment

      let seg_pred_arr = Array(2).fill(null).map(() => Array(prediction.length).fill(null));
      let tmp_arr = Array(2).fill(null).map(() => Array(prediction.length).fill(null));

      seg_pred_arr[1] = prediction;
      seg_pred_arr[0].splice(j, segment.length, ...segment);

      let score = this.segmentTraversal(seg_pred_arr, class_type, tmp_arr, j, segment);
      overlapScoreMap.set(class_type, score);
      //final_result.push(score);

      j += segment.length;

    }

    let sortedMap = new Map([...overlapScoreMap.entries()].sort((a, b) => {
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      return 0;
    }));

    final_result = Array.from(sortedMap.values());

    return final_result;

  }

  static micro_overall_acc(yTrue: any[], yPred: any[]): number {
    let correctPredictions = 0;

    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === yPred[i]) {
        correctPredictions++;
      }
    }

    return correctPredictions / yTrue.length;
  }


}


